# Scripts configuration for devenv
{ 
  pkgs,
  lib,
  appConfig,
  djangoModuleName,
  host,
  port,
  isDev ? false
}:
let
  # Common server startup logic (DRY) - now uses centralized config
  serverStartup = containerMode: let
    serverHost = if containerMode then appConfig.server.containerHost else if isDev then host else appConfig.server.containerHost;
    hostText = if containerMode then "containerized server" else "server";
  in ''
    # Use unified server script (DRY) and honor runtime env for host/port
    export DJANGO_HOST="''${DJANGO_HOST:-${if containerMode then appConfig.server.containerHost else host}}"
    export DJANGO_PORT="''${DJANGO_PORT:-${port}}"
    bash scripts/core/server-run.sh
  '';
in
{
  # Unified server commands that adapt to current mode
  run-server.exec = serverStartup false;

  # Containerized server (always binds to 0.0.0.0)  
  run-server-container.exec = serverStartup true;

  # Environment and deployment scripts
  set-prod-settings.exec = "${pkgs.uv}/bin/uv run python scripts/core/environment.py production";
  set-dev-settings.exec = "${pkgs.uv}/bin/uv run python scripts/core/environment.py development";
  set-central-settings.exec = "${pkgs.uv}/bin/uv run python scripts/core/environment.py central";

  # Container management - redirected to unified management system
  container-dev-up.exec = ''
    echo "🔄 Redirecting to unified container management..."
    manage dev && manage run
  '';

  container-prod-up.exec = ''
    echo "🔄 Redirecting to unified container management..."
    manage prod && manage run
  '';

  # Container management
  container-help.exec = ''
    echo "=== Lx Annotate Container Management ==="
    echo ""
    echo "🏗️  Modern Commands:"
    echo "  manage build         Build container for current mode"
    echo "  manage run           Run container for current mode"  
    echo "  manage stop          Stop all containers"
    echo "  manage clean         Clean containers and images"
    echo ""
    echo "🔧 Mode Management:"
    echo "  manage dev           Switch to development mode"
    echo "  manage prod          Switch to production mode"
    echo "  manage status        Show current status"
    echo ""
    echo "📋 Recommended Workflow:"
    echo "  1. manage dev && manage build && manage run"
    echo "  OR for production:"
    echo "  1. manage prod && manage build && manage run"
  '';

  container-stop.exec = ''
    manage stop
  '';

  container-clean.exec = ''
    manage clean
  '';

  # Service management (mode-aware)
  start-services.exec = ''
    # Runtime mode detection
    if [ "''${DJANGO_ENV:-development}" = "production" ]; then
      echo "Starting production environment..."
      echo "Note: External PostgreSQL and Redis services expected"
      devenv up django
    else
      echo "Starting development environment with local services..."
      devenv up django postgres
    fi
  '';

  services-up.exec = ''
    # Runtime mode detection
    if [ "''${DJANGO_ENV:-development}" = "production" ]; then
      echo "Production mode: Services should be managed externally"
      echo "Expecting PostgreSQL on external host"
      echo "Expecting Redis on external host"
    else
      echo "Starting development services (postgres, redis)..."
      devenv up postgres redis
    fi
  '';

  services-down.exec = ''
    echo "Stopping all processes..."
    devenv down
  '';

  services-logs.exec = ''
    echo "Following logs for all processes..."
    devenv processes
  '';



  # Database management
  db-shell.exec = ''
    if [ "''${DJANGO_ENV:-development}" = "production" ]; then
      echo "Production mode: Use external database tools"
      echo "Example: psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME>"
    else
      echo "Development mode: Connecting to local SQLite database"
      ${pkgs.uv}/bin/uv run python manage.py dbshell
    fi
  '';

  # Environment setup scripts
  env-pipe.exec = ''
    if [ ! -f "local_settings.py" ]; then
      echo "Setting up environment using unified management system..."
      manage setup
    else
      echo "Detected luxnix managed environment (local_settings.py exists)"
      echo "Skipping local configuration generation"
    fi
    env-export
  '';

  deploy-pipe.exec = ''
    deploy-migrate
    deploy-load-base-db-data
    deploy-collectstatic
  '';

  gpu-check.exec = "${pkgs.uv}/bin/uv run python scripts/utilities/gpu-check.py";

  # Core utility scripts
  ensure-psql.exec = "${pkgs.uv}/bin/uv run python scripts/database/ensure_psql.py";
  env-fetch-db-pwd-file.exec = "${pkgs.uv}/bin/uv run python scripts/database/fetch_db_pwd_file.py";
  env-init-conf.exec = "${pkgs.uv}/bin/uv run python scripts/database/make_conf.py";
  env-build.exec = "${pkgs.uv}/bin/uv run python scripts/core/setup.py";
  
  # Django management commands
  env-export.exec = ''
    set -a
    source .env
    set +a
    echo ".env file loaded successfully."
    echo "DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE"
  '';
  deploy-migrate.exec = "${pkgs.uv}/bin/uv run python manage.py migrate";
  deploy-load-base-db-data.exec = "${pkgs.uv}/bin/uv run python manage.py load_base_db_data";
  deploy-collectstatic.exec = "${pkgs.uv}/bin/uv run python manage.py collectstatic --noinput";
}
