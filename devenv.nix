{
  pkgs,
  lib,
  config,
  inputs,
  baseBuildInputs,
  ...
}:
let
  appName = "lx_annotate";
  secret = name: default: config.secretspec.secrets.${name} or default;
  runtimeEnvironment = import ./nix/runtime-environment.nix { inherit lib; };
  secretspecEncryptedDataDir = secret "LX_ANNOTATE_ENCRYPTED_DATA_DIR" "";
  masterKeyFile = secret "LX_ANNOTATE_MASTER_KEY_FILE" "";
  djangoSecretKeyFile = secret "DJANGO_SECRET_KEY_FILE" "";
  djangoDatabasePasswordFile = secret "DJANGO_DB_PASSWORD_FILE" "";
  djangoKeycloakClientSecretFile = secret "DJANGO_KEYCLOAK_CLIENT_SECRET_FILE" "";
  runtimeDataDir =
    if secretspecEncryptedDataDir == "" then secret "DATA_DIR" "data" else secretspecEncryptedDataDir;

  DEPLOYMENT_MODE = "prod";

  python = pkgs.python312;
  uvPackage = pkgs.uv;
  env.LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ];
  devTasks = import ./devenv/devTasks/default.nix {
    inherit config pkgs lib;
    env = baseEnv;
  };

  languages.javascript.enable = true;
  languages.javascript.package = pkgs.nodejs_22; # Specify the Node.js version
  languages.python.enable = true;
  languages.python.uv.enable = true;

  isDev = secret "DJANGO_ENV" "development" == "development";

  # 1. DEFINE STATIC ENV VARS HERE
  baseEnv =
    runtimeEnvironment.mkAppOwnedEnvironment {
      dataDir = runtimeDataDir;
      settingsModule = secret "DJANGO_SETTINGS_MODULE" "lx_annotate.settings.settings_dev";
      djangoEnv = secret "DJANGO_ENV" "development";
      staticUrl = secret "STATIC_URL" "/static/";
      protectedMediaUrl = secret "NGINX_PROTECTED_MEDIA_URL" "/protected_media/";
      mediaUrl = secret "MEDIA_URL" "/protected_media/";
      serveWithNginx = secret "SERVE_WITH_NGINX" "false";
    }
    // {

      # --- Directories & Paths ---
      containerHost = "None";
      containerMode = false;
      LX_ANNOTATE_ENCRYPTED_DATA_DIR = runtimeDataDir;
      ASSET_DIR = secret "ASSET_DIR" "tests/assets";
      HOME_DIR = secret "HOME_DIR" ".";
      WORKING_DIR = secret "WORKING_DIR" ".";
      DJANGO_STATIC_ROOT = secret "DJANGO_STATIC_ROOT" "staticfiles";

      # --- Network & Server ---
      HTTP_PROTOCOL = secret "HTTP_PROTOCOL" "https";
      DJANGO_HOST = secret "DJANGO_HOST" "localhost";
      DJANGO_PORT = secret "DJANGO_PORT" "8000";
      BASE_URL = secret "BASE_URL" "https://lx-annotate.local";
      ALLOWED_HOSTS = secret "ALLOWED_HOSTS" "lx-annotate.local,localhost,127.0.0.1";
      DJANGO_ALLOWED_HOSTS = secret "DJANGO_ALLOWED_HOSTS" "lx-annotate.local,localhost,127.0.0.1";
      DJANGO_CORS_ALLOWED_ORIGINS = secret "DJANGO_CORS_ALLOWED_ORIGINS" "https://lx-annotate.local,http://127.0.0.1:3000";
      DJANGO_CSRF_TRUSTED_ORIGINS = secret "DJANGO_CSRF_TRUSTED_ORIGINS" "https://lx-annotate.local,http://127.0.0.1:3000";
      EXEMPT_URLS = secret "EXEMPT_URLS" "^/accounts/login/$";
      LOGIN_URL = secret "LOGIN_URL" "/accounts/login/";

      # --- Database ---
      DJANGO_DB_ENGINE = secret "DJANGO_DB_ENGINE" "django.db.backends.postgresql";
      DEV_DB_ENGINE = secret "DEV_DB_ENGINE" "django.db.backends.postgresql";
      TEST_DB_ENGINE = secret "TEST_DB_ENGINE" "django.db.backends.postgresql";
      DJANGO_DB_NAME = secret "DJANGO_DB_NAME" "lxAnnotateLocal";
      DEV_DB_NAME = secret "DEV_DB_NAME" "lxAnnotateLocal";
      TEST_DB_NAME = secret "TEST_DB_NAME" "lxAnnotateTest";
      DJANGO_DB_USER = secret "DJANGO_DB_USER" "lxAnnotateLocal";
      DJANGO_DB_HOST = secret "DJANGO_DB_HOST" "localhost";
      DJANGO_DB_PORT = secret "DJANGO_DB_PORT" "5432";

      # --- Django Core ---
      DJANGO_SETTINGS_MODULE_DEVELOPMENT = secret "DJANGO_SETTINGS_MODULE_DEVELOPMENT" "lx_annotate.settings.settings_dev";
      DJANGO_DEBUG = secret "DJANGO_DEBUG" "True";
      VITE_ENABLE_DEBUG = secret "VITE_ENABLE_DEBUG" "false";
      TIME_ZONE = secret "TIME_ZONE" "Europe/Berlin";
      CENTER_NAME = secret "CENTER_NAME" "Default Center";

      # --- Authentication ---
      OIDC_RP_CLIENT_ID = secret "OIDC_RP_CLIENT_ID" "endoregdb-api";
      ENFORCE_AUTH = secret "ENFORCE_AUTH" "True";

      # --- Video processing and tests ---
      ENDOREG_STORAGE_PROFILE = secret "ENDOREG_STORAGE_PROFILE" "hybrid_default";
      VIDEO_DEFAULT_FPS = secret "VIDEO_DEFAULT_FPS" "50";
      VIDEO_ALLOW_FPS_FALLBACK = secret "VIDEO_ALLOW_FPS_FALLBACK" "True";
      LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION = secret "LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION" "3";
      DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE = secret "DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE" "500";
      RUN_VIDEO_TESTS = secret "RUN_VIDEO_TESTS" "False";
      SKIP_EXPENSIVE_TESTS = secret "SKIP_EXPENSIVE_TESTS" "True";
      TEST_RUN = secret "TEST_RUN" "False";
      TEST_RUN_FRAME_NUMBER = secret "TEST_RUN_FRAME_NUMBER" "500";
      TEST_DISABLE_MIGRATIONS = secret "TEST_DISABLE_MIGRATIONS" "False";
      VIDEO_POST_VALIDATION_JOB_MAX_WORKERS = secret "VIDEO_POST_VALIDATION_JOB_MAX_WORKERS" "2";
      VIDEO_POST_VALIDATION_JOB_MODE = secret "VIDEO_POST_VALIDATION_JOB_MODE" "celery";

      # --- Runtime policy and tool overrides ---
      CELERY_VISIBILITY_TIMEOUT_SECONDS = secret "CELERY_VISIBILITY_TIMEOUT_SECONDS" "90000";
      RUST_BACKTRACE = secret "RUST_BACKTRACE" "1";
      LOG_LEVEL = secret "LOG_LEVEL" "DEBUG";
      DRF_THROTTLE_ANON = secret "DRF_THROTTLE_ANON" "100/day";
      DRF_THROTTLE_USER = secret "DRF_THROTTLE_USER" "1000/day";
      ENDOREG_REPORT_PDF_RENDERER_BIN = secret "ENDOREG_REPORT_PDF_RENDERER_BIN" "";
      ENDOREG_DISABLE_RECONCILIATION = secret "ENDOREG_DISABLE_RECONCILIATION" "0";
      LX_ANONYMIZER_PATH = secret "LX_ANONYMIZER_PATH" "";
      OLLAMA_BIN = secret "OLLAMA_BIN" "";
      FFMPEG_EXECUTABLE = secret "FFMPEG_EXECUTABLE" "";
      FFMPEG_BINARY = secret "FFMPEG_BINARY" "";
      FFMPEG_PATH = secret "FFMPEG_PATH" "";
      FFMPEG_TRANSCODE_QUALITY_MODE = secret "FFMPEG_TRANSCODE_QUALITY_MODE" "balanced";

      # --- Watcher Dirs ---
      WATCHER_VIDEO_DIR = secret "WATCHER_VIDEO_DIR" "data/import/video_import";
      WATCHER_REPORT_DIR = secret "WATCHER_REPORT_DIR" "data/import/report_import";
      WATCHER_PREANONYMIZED_DIR = secret "WATCHER_PREANONYMIZED_DIR" "data/import/preanonymized_import";
      WATCHER_POLL_INTERVAL_SECONDS = secret "WATCHER_POLL_INTERVAL_SECONDS" "5";
      WATCHER_STABLE_AFTER_SECONDS = secret "WATCHER_STABLE_AFTER_SECONDS" "10";
      FFMPEG_TRANSCODE_TIMEOUT_SECONDS = secret "FFMPEG_TRANSCODE_TIMEOUT_SECONDS" "3600";
    }
    // lib.optionalAttrs (masterKeyFile != "") {
      LX_ANNOTATE_MASTER_KEY_FILE = masterKeyFile;
    }
    // lib.optionalAttrs (djangoSecretKeyFile != "") {
      DJANGO_SECRET_KEY_FILE = djangoSecretKeyFile;
    }
    // lib.optionalAttrs (djangoDatabasePasswordFile != "") {
      DJANGO_DB_PASSWORD_FILE = djangoDatabasePasswordFile;
    }
    // lib.optionalAttrs (djangoKeycloakClientSecretFile != "") {
      DJANGO_KEYCLOAK_CLIENT_SECRET_FILE = djangoKeycloakClientSecretFile;
    };

  devenv_utils = import ./devenv/default.nix {
    pkgs = pkgs;
    lib = lib;
    uvPackage = uvPackage;
    isDev = isDev;
    env = baseEnv;
  };

  commonShellHook = ''
    export PATH="$PATH:$(yarn global bin)"
  '';

  customProcesses = (
    import ./devenv/processes/default.nix ({
      inherit
        config
        pkgs
        lib
        baseEnv
        ;
    })
  );

  myTesseract = pkgs.tesseract.override {
    enableLanguages = [
      "eng"
      "deu"
    ];
  };

  # Ollama pulls CUDA-linked dependencies in this nixpkgs snapshot.
  # We keep it opt-in so shell evaluation remains reliable on non-CUDA setups.
  enableOllama = builtins.getEnv "DEVENV_ENABLE_OLLAMA" == "1";

  runtimePackages =
    with pkgs;
    [
      stdenv.cc.cc.lib
      ffmpeg-headless.bin
      uvPackage
      libglvnd # Add libglvnd for libGL.so.1
      glib
      zlib
      git
      myTesseract
      secretspec
      libxcb
    ]
    ++ lib.optionals enableOllama [ ollama.out ];

  runtimeLibraryPath =
    lib.makeLibraryPath runtimePackages
    + ":/run/opengl-driver/lib:/run/opengl-driver-32/lib"
    + ":/usr/lib/wsl/lib"
    + ":/usr/lib/x86_64-linux-gnu"
    + ":/usr/lib";

  _module.args.buildInputs = baseBuildInputs;

  SYNC_CMD = "uv sync --active --extra dev --extra docs";
  nixpkgs.config.allowUnfree = true;

in
{
  dotenv.enable = false;
  dotenv.disableHint = true;
  packages = lib.unique (devenv_utils.buildInputs ++ runtimePackages);

  env = baseEnv // {
    UV_PROJECT_ENVIRONMENT = lib.mkForce ".devenv/state/venv";
    LD_LIBRARY_PATH = runtimeLibraryPath;
    TESSDATA_PREFIX = "${myTesseract}/share/tessdata";
    PYTORCH_ALLOC_CONF = "expandable_segments:True";
  };

  languages.python = {
    enable = true;
    package = lib.mkForce pkgs.python312;
    uv = {
      enable = true;
      package = uvPackage;
      sync.enable = false;
    };
  };

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.install.enable = false;
  };

  processes = devenv_utils.processes;
  containers = devenv_utils.containers;
  tasks = devTasks;

  scripts = {
    export-nix-vars.exec = ''
      cat > .devenv-vars.json << EOF
      {
      }
      EOF
      echo "Exported Nix variables to .devenv-vars.json"
    '';

    env-setup.exec = ''
      # Ensure runtimePackages are included in the library path here too
      export LD_LIBRARY_PATH="${runtimeLibraryPath}"
      which tesseract
    '';

    hello.package = pkgs.zsh;
    hello.exec = "uv run python hello.py";
    pyshell.exec = "uv run python manage.py shell";

    mkdocs.exec = ''
      uv run make -C docs html
      uv run make -C docs linkcheck
    '';
    uvsnc.exec = ''
      ${SYNC_CMD}
    '';

  }
  // devenv_utils.scripts;

  enterShell = lib.mkAfter ''



    mkdir -p "${baseEnv.STORAGE_DIR}"
    mkdir -p "${baseEnv.ASSET_DIR}"
    mkdir -p "${baseEnv.HOME_DIR}"
    mkdir -p "${baseEnv.WORKING_DIR}"
    mkdir -p "${baseEnv.DJANGO_STATIC_ROOT}"


    echo "Exporting environment variables from .env.systemd file..."
    echo "Note: In dev mode you can set defaults in secretspec.toml or source them from local env by enabling the env source in your config.yaml for secretspec."
    if [ -f ".env.systemd" ]; then
      set -a
      source .env.systemd
      set +a
      echo ".env.systemd file loaded successfully."
    else
      echo "Note: .env.systemd not found. Defaults apply."
    fi
    # Keep a manually activated legacy .venv from shadowing the devenv-managed
    # interpreter when direnv reloads the shell.
    if [ -n "''${VIRTUAL_ENV:-}" ] && [ "''${VIRTUAL_ENV}" != "$PWD/.devenv/state/venv" ]; then
      if command -v deactivate >/dev/null 2>&1; then
        deactivate
      fi
      clean_path=""
      old_ifs="$IFS"
      IFS=:
      for entry in $PATH; do
        if [ "$entry" != "$PWD/.venv/bin" ]; then
          clean_path="''${clean_path:+$clean_path:}$entry"
        fi
      done
      IFS="$old_ifs"
      export PATH="$clean_path"
      unset VIRTUAL_ENV VIRTUAL_ENV_PROMPT
    fi

    # Activate Python virtual environment managed by uv inside of devenv
    echo "Virtual environment activated."
    source .devenv/state/venv/bin/activate

  '';
}
