{ config
, lib
, pkgs
, ...
}:
with lib;
with lib.luxnix; let
  cfg = config.services.luxnix.lxAnnotateLocal;
  gs = config.luxnix.generic-settings;
  gsp = gs.postgres;

  adminName = config.user.admin.name;
  scriptName = "runLocalLxAnnotate";

  # Use configuration options or fallback to defaults
  gitURL = cfg.repository.url;
  repoDirName = "lx-annotate";
  branchName = cfg.repository.branch;

  endoreg-service-user-name = config.user.endoreg-service-user.name;
  endoreg-service-user = config.users.users.${endoreg-service-user-name};
  endoreg-service-user-home = endoreg-service-user.home;
  repoDir = "${endoreg-service-user-home}/${repoDirName}";

  # Environment variable configuration
  envDataDir = "${repoDir}/${cfg.api.dataDir}";
  envConfDir = "${repoDir}/${cfg.api.confDir}";
  envConfTemplateDir = "${repoDir}/${cfg.api.confTemplateDir}";
  envDjangoModule = cfg.api.djangoModule;
  envHttpProtocol = if cfg.api.httpProtocol != "http" then cfg.api.httpProtocol else (if cfg.api.useHttps then "https" else "http");
  envDjangoHost = cfg.api.hostname;
  envDjangoPort = toString cfg.api.port;
  envBaseUrl = 
    if cfg.api.baseUrl != null 
    then cfg.api.baseUrl 
    else "${envHttpProtocol}://${envDjangoHost}:${envDjangoPort}";

  makeAbsolute = path: if lib.hasPrefix "/" path then path else "${repoDir}/${path}";

  envStorageDir = makeAbsolute cfg.api.storageDir;
  envAssetDir = makeAbsolute cfg.api.assetDir;
  envStaticUrl = cfg.api.staticUrl;
  envMediaUrl = cfg.api.mediaUrl;
  envRunVideoTests = if cfg.api.runVideoTests then "true" else "false";
  envSkipExpensiveTests = if cfg.api.skipExpensiveTests then "true" else "false";

  settingsProfile = cfg.api.settingsProfile;
  envIsCentralNode = cfg.api.extraSettings.IS_CENTRAL_NODE or false;
  derivedSettingsModule =
    if settingsProfile == "dev" then "config.settings.dev"
    else if settingsProfile == "central" then "config.settings.central"
    else if settingsProfile == "test" then "config.settings.test"
    else "config.settings.prod";
  envDjangoSettingsModule =
    if cfg.api.settingsModule != null then cfg.api.settingsModule
    else if envIsCentralNode && settingsProfile != "dev" && settingsProfile != "test" then "config.settings.central"
    else derivedSettingsModule;
  envDjangoEnv =
    if cfg.api.djangoEnv != null then cfg.api.djangoEnv
    else if envIsCentralNode || settingsProfile == "central" then "central"
    else if settingsProfile == "dev" then "development"
    else if settingsProfile == "test" then "test"
    else "production";
  envCentralNodeFlag = if envIsCentralNode || settingsProfile == "central" then "true" else "false";

  runLocalLxAnnotateScript = pkgs.writeShellScriptBin "${scriptName}" ''
    set -euo pipefail
    
    # Debug mode flag - controls verbose logging
    DEBUG_MODE=${if cfg.debugMode then "true" else "false"}

    echo "Starting LxAnnotate service..."
    echo "Repository: ${gitURL}"
    echo "Branch: ${branchName}"
    echo "Target Directory: ${repoDir}"
    
    # Clone or update repository
    if [ ! -d ${repoDir} ]; then
      echo "Cloning repository..."
      git clone ${gitURL} ${repoDir}
      cd ${repoDir}
    else
      cd ${repoDir}
      ${if cfg.repository.updateOnBoot then ''
        echo "Updating repository..."
        git fetch origin || { echo "ERROR: Failed to fetch from origin"; exit 1; }
      '' else ''
        echo "Repository update disabled, using existing code"
      ''}
    fi
    
    # Checkout specified branch with proper remote tracking
    echo "Checking out branch: ${branchName}"
    if git show-ref --verify --quiet refs/heads/${branchName}; then
      # Local branch exists, switch to it
      echo "Local branch ${branchName} exists, switching to it"
      git checkout ${branchName} || { echo "ERROR: Failed to checkout local branch ${branchName}"; exit 1; }
    elif git show-ref --verify --quiet refs/remotes/origin/${branchName}; then
      # Remote branch exists, create local tracking branch
      echo "Remote branch origin/${branchName} exists, creating local tracking branch"
      git checkout -b ${branchName} origin/${branchName} || { echo "ERROR: Failed to create tracking branch for ${branchName}"; exit 1; }
    else
      echo "ERROR: Branch ${branchName} does not exist locally or on remote"
      echo "Available remote branches:"
      git branch -r || echo "Could not list remote branches"
      exit 1
    fi
    
    ${if cfg.repository.updateOnBoot then ''
    # Update the current branch
    echo "Updating branch ${branchName}..."
    git pull origin ${branchName} || { 
      echo "WARNING: Failed to pull latest changes for ${branchName}, trying to reset to remote"
      git reset --hard origin/${branchName} || { 
        echo "ERROR: Failed to update branch ${branchName}"
        exit 1
      }
    }
    '' else ""}

    # Copy database password from vault (managed by postgres-default role)
    echo "Setting up database configuration..."
    
    if [ "$DEBUG_MODE" = "true" ]; then
      echo "Current user: $(whoami)"
      echo "User groups: $(groups)"
      echo "Checking for database password file: ${cfg.database.passwordFile}"
    fi
    
    # Debug secret file access
    SECRET_FILE="${cfg.database.passwordFile}"
    if [ -f "$SECRET_FILE" ]; then
      if [ "$DEBUG_MODE" = "true" ]; then
        echo "Secret file exists: $SECRET_FILE"
        ls -la "$SECRET_FILE" || echo "Cannot stat secret file"
        echo "Testing read access..."
      fi
      if head -c 10 "$SECRET_FILE" >/dev/null 2>&1; then
        if [ "$DEBUG_MODE" = "true" ]; then
          echo "✓ Can read secret file"
        fi
      else
        echo "✗ Cannot read secret file"
        if [ "$DEBUG_MODE" = "true" ]; then
          echo "File permissions:"
          ls -la "$SECRET_FILE" 2>/dev/null || echo "Cannot access file"
          echo "Directory permissions:"
          ls -la "$(dirname "$SECRET_FILE")" 2>/dev/null || echo "Cannot access directory" 
          echo "Parent directory permissions:"
          ls -la "/etc/secrets" 2>/dev/null || echo "Cannot access /etc/secrets"
        fi
      fi
    else
      echo "Secret file does not exist: $SECRET_FILE"
      if [ "$DEBUG_MODE" = "true" ]; then
        echo "Directory contents:"
        ls -la "$(dirname "$SECRET_FILE")" 2>/dev/null || echo "Cannot access $(dirname "$SECRET_FILE")"
        ls -la "/etc/secrets" 2>/dev/null || echo "Cannot access /etc/secrets"
      fi
    fi
    
  # Ensure runtime directories exist (they might be ignored in git)
  mkdir -p ${envConfDir} ${envDataDir} ${envStorageDir}
    
    if [ -f "$SECRET_FILE" ] && head -c 1 "$SECRET_FILE" >/dev/null 2>&1; then
      cp "$SECRET_FILE" ${envConfDir}/db_pwd
      echo "Database password copied from vault to ${envConfDir}/db_pwd"
      
      # Run Django application's configuration setup
      echo "Running Django application configuration setup..."
      cd ${repoDir}
      
      # Set environment variables needed by the Django config scripts
      export DATA_DIR="${envDataDir}"
      export STORAGE_DIR="${envStorageDir}"
      export CONF_DIR="${envConfDir}"
      export CONF_TEMPLATE_DIR="${envConfTemplateDir}"
      export WORKING_DIR="${repoDir}"
      export HOME_DIR="${endoreg-service-user-home}"
      export DB_PWD_FILE="${envConfDir}/db_pwd"
      export DJANGO_MODULE="${envDjangoModule}"
      export DJANGO_SETTINGS_MODULE="${envDjangoSettingsModule}"
      export DJANGO_SETTINGS_MODULE_PRODUCTION="config.settings.prod"
      export DJANGO_SETTINGS_MODULE_DEVELOPMENT="config.settings.dev"
      export DJANGO_SETTINGS_MODULE_CENTRAL="config.settings.central"
      export DJANGO_ENV="${envDjangoEnv}"
      export CENTRAL_NODE="${envCentralNodeFlag}"
      export HTTP_PROTOCOL="${envHttpProtocol}"
      export DJANGO_HOST="${envDjangoHost}"
      export DJANGO_PORT="${envDjangoPort}"
      export BASE_URL="${envBaseUrl}"
      export TIME_ZONE="${cfg.api.timeZone}"
      export STATIC_URL="${envStaticUrl}"
      export MEDIA_URL="${envMediaUrl}"
      export ASSET_DIR="${envAssetDir}"
      export RUN_VIDEO_TESTS="${envRunVideoTests}"
      export SKIP_EXPENSIVE_TESTS="${envSkipExpensiveTests}"

      DB_PASSWORD_VALUE="$(tr -d '\n' < ${envConfDir}/db_pwd 2>/dev/null || true)"
      export DB_ENGINE="django.db.backends.postgresql"
      export DB_NAME="${cfg.database.name}"
      export DB_USER="${cfg.database.user}"
      export DB_PASSWORD="$DB_PASSWORD_VALUE"
      export DB_HOST="${cfg.database.host}"
      export DB_PORT="${toString cfg.database.port}"
      export DB_SSLMODE="${cfg.database.sslMode}"
      
      # Ensure devenv is available and run the configuration script
      if command -v devenv >/dev/null 2>&1; then
        echo "Running Django configuration setup via devenv..."
        devenv shell env-init-conf || { 
          echo "WARNING: devenv env-init-conf failed, trying direct script execution"
          # Fallback to direct execution if devenv fails
          if [ -f "scripts/make_conf.py" ]; then
            python scripts/make_conf.py || echo "WARNING: make_conf.py execution failed"
          fi
        }

        echo "Building .env from template..."
        if ! devenv shell env-build; then
          echo "WARNING: devenv env-build failed, attempting direct execution"
          if ! devenv shell -- uv run env_setup.py; then
            if [ -f "env_setup.py" ]; then
              python env_setup.py || echo "WARNING: env_setup.py execution failed"
            fi
          fi
        fi
      else
        echo "devenv not available, trying direct script execution..."
        if [ -f "scripts/make_conf.py" ]; then
          python scripts/make_conf.py || echo "WARNING: make_conf.py execution failed"
        else
          echo "WARNING: scripts/make_conf.py not found"
        fi

        if [ -f "env_setup.py" ]; then
          echo "Building .env from template via python env_setup.py"
          python env_setup.py || echo "WARNING: env_setup.py execution failed"
        fi
      fi
      
      # Verify that the required db.yaml file was created
      if [ -f "${envConfDir}/db.yaml" ]; then
        echo "✓ Django configuration file created: ${envConfDir}/db.yaml"
      else
        echo "WARNING: Django configuration file ${envConfDir}/db.yaml was not created"
        echo "Contents of conf directory:"
        ls -la "${envConfDir}/" 2>/dev/null || echo "Cannot access conf directory"
      fi

      # Force production mode indicators for the devenv shell helpers
      echo "Setting deployment mode markers..."
      echo "${envDjangoEnv}" > .mode
      chmod 600 .mode 2>/dev/null || true

      if [ -f .env ]; then
        echo "Aligning .env with production settings module"
        export DESIRED_SETTINGS_MODULE="${envDjangoSettingsModule}"
        export DESIRED_ENVIRONMENT="${envDjangoEnv}"
        python - <<'PY'
import os
from pathlib import Path

env_path = Path('.env')
desired_module = os.environ['DESIRED_SETTINGS_MODULE']
desired_env = os.environ['DESIRED_ENVIRONMENT']

if not env_path.exists():
    raise SystemExit(0)

lines = env_path.read_text(encoding='utf-8').splitlines()
updated = []
have_module = False
have_env = False

for line in lines:
    if line.startswith('DJANGO_SETTINGS_MODULE='):
        updated.append(f'DJANGO_SETTINGS_MODULE={desired_module}')
        have_module = True
    elif line.startswith('DJANGO_ENV='):
        updated.append(f'DJANGO_ENV={desired_env}')
        have_env = True
    else:
        updated.append(line)

if not have_module:
    updated.append(f'DJANGO_SETTINGS_MODULE={desired_module}')

if not have_env:
    updated.append(f'DJANGO_ENV={desired_env}')

env_path.write_text('\n'.join(updated) + '\n', encoding='utf-8')
PY
      else
        echo "WARNING: .env not found after setup; production overrides skipped"
      fi
      
    else
      echo "ERROR: Database password not found in vault or not accessible. PostgreSQL setup may not be complete."
      exit 1
    fi

    # Copy Django configuration
    echo "Setting up Django configuration..."
    echo "Service user home: ${endoreg-service-user-home}"
    echo "Current user: $(whoami)"
    echo "Current directory: $(pwd)"
    
    # Check if home directory exists and is accessible
    if [ ! -d "${endoreg-service-user-home}" ]; then
      echo "ERROR: Home directory ${endoreg-service-user-home} does not exist"
      exit 1
    fi
    
    # Ensure config directory exists with correct permissions
    CONFIG_DIR="${endoreg-service-user-home}/config"
    echo "Checking config directory: $CONFIG_DIR"
    
    if [ ! -d "$CONFIG_DIR" ]; then
      echo "Creating config directory: $CONFIG_DIR"
      mkdir -p "$CONFIG_DIR" || { echo "ERROR: Failed to create config directory $CONFIG_DIR"; ls -la "${endoreg-service-user-home}"; exit 1; }
    else
      echo "Config directory already exists"
    fi
    
    # Check permissions
    ls -la "${endoreg-service-user-home}/" || echo "Cannot list home directory contents"
    
   
    ${lib.optionalString (cfg.service.extraEnvironment != {}) ''
    # Set additional environment variables
    ${lib.concatStringsSep "\n" (lib.mapAttrsToList (name: value: "export ${name}='${value}'") cfg.service.extraEnvironment)}
    ''}
    SECRETSPEC_CONFIG_DIR="${endoreg-service-user-home}/.config/secretspec"
    mkdir -p "$SECRETSPEC_CONFIG_DIR"
    
    echo "Generating secretspec configuration at $SECRETSPEC_CONFIG_DIR/config.toml..."
    cat > "$SECRETSPEC_CONFIG_DIR/config.toml" <<EOF
[defaults]
provider = "env"
profile = "default"
EOF
    
    # Ensure correct ownership
    chown -R ${endoreg-service-user-name}:${endoreg-service-group-name} "${endoreg-service-user-home}/.config"

    echo "Starting Django server..."
    echo "Hostname: ${envDjangoHost}"
    echo "Port: ${envDjangoPort}"
    echo "Protocol: ${envHttpProtocol}"
    
    # Start the Django application
    exec devenv shell -- run-server
  '';

in
{
  options.services.luxnix.lxAnnotateLocal = {
    enable = mkBoolOpt false "Enable EndoRegDbApi Service";

    # Configuration options (passed from endoreg-client role)
    api = mkOption {
      type = types.submodule {
        options = {
          hostname = mkOption { type = types.str; default = "localhost"; };
          port = mkOption { type = types.port; default = 8117; };
          useHttps = mkOption { type = types.bool; default = false; };
          sslCertificatePath = mkOption { type = types.nullOr types.path; default = null; };
          sslKeyPath = mkOption { type = types.nullOr types.path; default = null; };
          djangoAllowedHosts = mkOption { type = types.listOf types.str; default = ["localhost" "127.0.0.1"]; };
          djangoDebug = mkOption { type = types.bool; default = false; };
          djangoSecretKeyFile = mkOption { type = types.path; default = "/etc/secrets/vault/django_secret_key"; };
          corsAllowedOrigins = mkOption { type = types.listOf types.str; default = []; };
          logLevel = mkOption { type = types.str; default = "INFO"; };
          maxRequestSize = mkOption { type = types.str; default = "100M"; };
          timeZone = mkOption { type = types.str; default = "Europe/Berlin"; };
          language = mkOption { type = types.str; default = "en-us"; };

          settingsProfile = mkOption {
            type = types.enum [ "dev" "prod" "central" "test" ];
            default = "prod";
            description = "Base settings profile to use when selecting Django settings modules.";
          };
          settingsModule = mkOption {
            type = types.nullOr types.str;
            default = null;
            description = "Explicit Django settings module (overrides settingsProfile).";
          };
          djangoEnv = mkOption {
            type = types.nullOr types.str;
            default = null;
            description = "Value for DJANGO_ENV; inferred from settingsProfile when null.";
          };
          
          # Environment variable configuration options
          dataDir = mkOption { 
            type = types.str; 
            default = "data"; 
            description = "Relative path to data directory within the repository";
          };
          storageDir = mkOption {
            type = types.str;
            default = "storage";
            description = "Relative or absolute path used for STORAGE_DIR.";
          };
          confDir = mkOption { 
            type = types.str; 
            default = "conf"; 
            description = "Relative path to configuration directory within the repository";
          };
          confTemplateDir = mkOption { 
            type = types.str; 
            default = "conf_template"; 
            description = "Relative path to configuration template directory within the repository";
          };
          djangoModule = mkOption { 
            type = types.str; 
            default = "lx_annotate"; 
            description = "Django module name for the application";
          };
          assetDir = mkOption {
            type = types.str;
            default = "tests/assets";
            description = "Relative or absolute path used as ASSET_DIR.";
          };
          httpProtocol = mkOption { 
            type = types.str; 
            default = "http"; 
            description = "HTTP protocol to use (http or https)";
          };
          baseUrl = mkOption { 
            type = types.nullOr types.str; 
            default = null; 
            description = "Base URL for the application. If null, will be constructed from protocol, host, and port";
          };
          staticUrl = mkOption {
            type = types.str;
            default = "/static/";
            description = "STATIC_URL value exported to the application.";
          };
          mediaUrl = mkOption {
            type = types.str;
            default = "/media/";
            description = "MEDIA_URL value exported to the application.";
          };
          runVideoTests = mkOption {
            type = types.bool;
            default = false;
            description = "Whether RUN_VIDEO_TESTS should be enabled.";
          };
          skipExpensiveTests = mkOption {
            type = types.bool;
            default = true;
            description = "Whether SKIP_EXPENSIVE_TESTS should be enabled.";
          };
          
          extraSettings = mkOption { 
            type = types.attrsOf types.anything; 
            default = {}; 
            description = "Additional settings to pass to Django configuration";
          };
        };
      };
      default = {};
      description = "API configuration options";
    };

    database = mkOption {
      type = types.submodule {
        options = {
          host = mkOption { type = types.str; default = "localhost"; };
          port = mkOption { type = types.port; default = 5432; };
          name = mkOption { type = types.str; default = "endoregDbLocal"; };
          user = mkOption { type = types.str; default = "endoregDbLocal"; };
          passwordFile = mkOption { type = types.path; default = "/etc/secrets/vault/SCRT_local_password_maintenance_password"; };
          sslMode = mkOption { type = types.str; default = "prefer"; };
        };
      };
      default = {};
      description = "Database configuration options";
    };

    service = mkOption {
      type = types.submodule {
        options = {
          workers = mkOption { type = types.int; default = 1; };
          maxRequests = mkOption { type = types.int; default = 1000; };
          timeout = mkOption { type = types.int; default = 30; };
          keepAlive = mkOption { type = types.int; default = 60; };
          extraEnvironment = mkOption { type = types.attrsOf types.str; default = {}; };
        };
      };
      default = {};
      description = "Service configuration options";
    };

    repository = mkOption {
      type = types.submodule {
        options = {
          url = mkOption { type = types.str; default = "https://github.com/wg-lux/endo-api"; };
          branch = mkOption { type = types.str; default = "main"; };
          updateOnBoot = mkOption { type = types.bool; default = true; };
        };
      };
      default = {};
      description = "Repository configuration options";
    };

    debugMode = mkOption {
      type = types.bool;
      default = false;
      description = "Enable verbose debug output including sensitive file information. Should be disabled in production.";
    };
  };

  config = mkIf cfg.enable {
    luxnix.generic-settings.postgres = {
      enable = true;
    };
    
    # Ensure directory structure exists with correct permissions
    systemd.tmpfiles.rules = [
      # Create the service user home directory
      "d ${endoreg-service-user-home} 0755 ${endoreg-service-user-name} ${endoreg-service-user-name} - -"
      # Create the config subdirectory  
      "d ${endoreg-service-user-home}/config 0755 ${endoreg-service-user-name} ${endoreg-service-user-name} - -"
    ];
    
    systemd.services."endo-api-boot" = {
      description = "Clone or pull endoreg-db-api and run prod-server";
      wantedBy = [ "multi-user.target" ];
      after = [ "postgres-endoreg-setup.service" "endoreg-django-setup.service" "systemd-tmpfiles-setup.service" ];
      requires = [ "postgres-endoreg-setup.service" "systemd-tmpfiles-setup.service" ];
      serviceConfig = {
        Type = "exec";
        User = endoreg-service-user-name;
        Environment = "PATH=${pkgs.git}/bin:${pkgs.devenv}/bin:/run/current-system/sw/bin";
        ExecStart = "${runLocalEndoApiScript}/bin/${scriptName}";
        Restart = "on-failure";
        RestartSec = "10s";
        # Resource limits
        MemoryMax = "2G";
        CPUQuota = "200%";
      };
    };
  };
}
