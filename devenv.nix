{ 
  pkgs, 
  lib, 
  config, 
  inputs, 
  baseBuildInputs, 
  ... }:
let
  appName = "lx_annotate";
  DEPLOYMENT_MODE = "prod";

  python = pkgs.python312;
  uvPackage = pkgs.uv;

  devTasks = import ./devenv/devTasks/default.nix { inherit config pkgs lib; env=baseEnv; };

  languages.javascript.enable = true;
  languages.javascript.package = pkgs.nodejs_22; # Specify the Node.js version
  languages.python.enable = true;
  languages.python.uv.enable = true;

  isDev = if config.secretspec.secrets.DJANGO_ENV == "development" then true else false;

  # 1. DEFINE STATIC ENV VARS HERE
  # These are variables that do NOT depend on devenv_utils
  baseEnv = {
    # --- Directories & Paths ---
    containerHost = "None";
    containerMode = false;
    STORAGE_DIR = config.secretspec.secrets.STORAGE_DIR;
    ASSET_DIR = config.secretspec.secrets.ASSET_DIR;
    HOME_DIR = config.secretspec.secrets.HOME_DIR;
    WORKING_DIR = config.secretspec.secrets.WORKING_DIR;
    DJANGO_STATIC_ROOT = config.secretspec.secrets.DJANGO_STATIC_ROOT;
    # --- Network & Server ---
    HTTP_PROTOCOL = config.secretspec.secrets.HTTP_PROTOCOL;
    DJANGO_HOST = config.secretspec.secrets.DJANGO_HOST;
    DJANGO_PORT = config.secretspec.secrets.DJANGO_PORT;
    BASE_URL = config.secretspec.secrets.BASE_URL;
    ALLOWED_HOSTS = config.secretspec.secrets.ALLOWED_HOSTS;
    DJANGO_ALLOWED_HOSTS = config.secretspec.secrets.ALLOWED_HOSTS;
    DJANGO_CSRF_TRUSTED_ORIGINS = config.secretspec.secrets.DJANGO_CSRF_TRUSTED_ORIGINS;
    STATIC_URL = config.secretspec.secrets.STATIC_URL;
    MEDIA_URL = config.secretspec.secrets.MEDIA_URL;
    EXEMPT_URLS = config.secretspec.secrets.EXEMPT_URLS;
    LOGIN_URL = config.secretspec.secrets.LOGIN_URL;

    # --- Database ---
    DJANGO_DB_ENGINE = config.secretspec.secrets.DJANGO_DB_ENGINE;
    DJANGO_DB_NAME = config.secretspec.secrets.DJANGO_DB_NAME;
    DJANGO_DB_USER = config.secretspec.secrets.DJANGO_DB_USER;
    DJANGO_DB_PASSWORD = config.secretspec.secrets.DJANGO_DB_PASSWORD;
    DJANGO_DB_HOST = config.secretspec.secrets.DJANGO_DB_HOST;
    DJANGO_DB_PORT = config.secretspec.secrets.DJANGO_DB_PORT;

    # --- Django Core ---
    DJANGO_SETTINGS_MODULE = config.secretspec.secrets.DJANGO_SETTINGS_MODULE;
    DJANGO_SETTINGS_MODULE_PRODUCTION = config.secretspec.secrets.DJANGO_SETTINGS_MODULE_PRODUCTION;
    DJANGO_SETTINGS_MODULE_DEVELOPMENT = config.secretspec.secrets.DJANGO_SETTINGS_MODULE_DEVELOPMENT;
    DJANGO_ENV = config.secretspec.secrets.DJANGO_ENV;
    DJANGO_DEBUG = config.secretspec.secrets.DJANGO_DEBUG;
    TIME_ZONE = config.secretspec.secrets.TIME_ZONE;
    DEFAULT_CENTER = config.secretspec.secrets.CENTER_NAME;

    # --- Authentication & Secrets ---
    DJANGO_SECRET_KEY = config.secretspec.secrets.DJANGO_SECRET_KEY;
    SECRET_KEY = config.secretspec.secrets.SECRET_KEY;
    OIDC_RP_CLIENT_ID = config.secretspec.secrets.OIDC_RP_CLIENT_ID;
    OIDC_RP_CLIENT_SECRET = config.secretspec.secrets.OIDC_RP_CLIENT_SECRET;

    # --- AI & HuggingFace Models ---
    HF_HOME = config.secretspec.secrets.HF_HOME;
    HF_HUB_CACHE = config.secretspec.secrets.HF_HUB_CACHE;
    TRANSFORMERS_CACHE = config.secretspec.secrets.TRANSFORMERS_CACHE;
    OLLAMA_MODELS = config.secretspec.secrets.OLLAMA_MODELS;
    OLLAMA_KEEP_ALIVE = config.secretspec.secrets.OLLAMA_KEEP_ALIVE;
    HF_HUB_ENABLE_HF_TRANSFER = config.secretspec.secrets.HF_HUB_ENABLE_HF_TRANSFER;

    # --- Video Processing & Tests ---
    RUN_VIDEO_TESTS = config.secretspec.secrets.RUN_VIDEO_TESTS;
    SKIP_EXPENSIVE_TESTS = config.secretspec.secrets.SKIP_EXPENSIVE_TESTS;
    VIDEO_DEFAULT_FPS = config.secretspec.secrets.VIDEO_DEFAULT_FPS;
    VIDEO_ALLOW_FPS_FALLBACK = config.secretspec.secrets.VIDEO_ALLOW_FPS_FALLBACK;
    LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION = config.secretspec.secrets.LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION;
    DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE = config.secretspec.secrets.DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE;

    # --- System & Throttling ---
    RUST_BACKTRACE = config.secretspec.secrets.RUST_BACKTRACE;
    DRF_THROTTLE_ANON = config.secretspec.secrets.DRF_THROTTLE_ANON;
    DRF_THROTTLE_USER = config.secretspec.secrets.DRF_THROTTLE_USER;
    TEST_RUN_FRAME_NUMBER = config.secretspec.secrets.TEST_RUN_FRAME_NUMBER;
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

  customTasks = ( 
    import ./devenv/tasks/default.nix ({
      inherit config pkgs lib baseEnv;
    })
  );

  customProcesses = (
    import ./devenv/processes/default.nix ({
       inherit config pkgs lib baseEnv;
    })
  );

  imports = [
    ./frontend/flake.nix
  ];
  myTesseract = pkgs.tesseract.override {
    enableLanguages = [ "eng" "deu" ];
  };


  _module.args.buildInputs = baseBuildInputs;

  SYNC_CMD = "uv sync --extra dev --extra docs";
  nixpkgs.config.allowUnfree = true;

in
{
  secretspec.provider = "env";

  dotenv.enable = false;
  packages = devenv_utils.buildInputs ++ [ 
    myTesseract
    pkgs.ollama
    pkgs.git
    pkgs.secretspec
    pkgs.cachix
     ];


  env = baseEnv // {
    # include runtimePackages as well so runtime native libs (e.g. zlib) are on LD_LIBRARY_PATH
    LD_LIBRARY_PATH =
          lib.makeLibraryPath (devenv_utils.buildInputs ++ [myTesseract])
          + ":/run/opengl-driver/lib:/run/opengl-driver-32/lib"
          + ":/usr/lib/wsl/lib"
          + ":/usr/lib/x86_64-linux-gnu"
          + ":/usr/lib"
          ;
  };

  languages.python = {
    enable = true;
    package = pkgs.python312;
    uv = {
      enable = true;
      package = uvPackage;
      sync.enable = true;
    };
  };
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22; 
    npm.install.enable = true; 
  };


  
  tasks = devenv_utils.tasks;
  processes = devenv_utils.processes;
  containers = devenv_utils.containers;
  services = devenv_utils.services;

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
      export LD_LIBRARY_PATH="${
        with pkgs; lib.makeLibraryPath (devenv_utils.buildInputs)
      }:/run/opengl-driver/lib:/run/opengl-driver-32/lib"
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
  
  } // devenv_utils.scripts;

  cachix.enable = true;


  enterShell = lib.mkAfter ''
    direnv disallow
    export SYNC_CMD="uv sync"
    
    # Ensure dependencies are synced using uv
    # Check if venv exists. If not, run sync verbosely. If it exists, sync quietly.
    if [ ! -d ".devenv/state/venv" ]; then
       echo "Virtual environment not found. Running initial uv sync..."
       $SYNC_CMD || echo "Error: Initial uv sync failed. Please check network and pyproject.toml."
    else
       # Sync quietly if venv exists
       echo "Syncing Python dependencies with uv..."
       $SYNC_CMD --quiet || echo "Warning: uv sync failed. Environment might be outdated."
    fi

    mkdir -p "${config.secretspec.secrets.STORAGE_DIR}"
    mkdir -p "${config.secretspec.secrets.ASSET_DIR}"
    mkdir -p "${config.secretspec.secrets.HOME_DIR}"
    mkdir -p "${config.secretspec.secrets.WORKING_DIR}"
    mkdir -p "${config.secretspec.secrets.DJANGO_STATIC_ROOT}"
    mkdir -p "./.devenv/state/logs"

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
    # Activate Python virtual environment managed by uv inside of devenv
    # Activate Python virtual environment managed by uv inside of devenv
    ACTIVATED=false
    if [ -f ".devenv/state/venv/bin/activate" ]; then
      source .devenv/state/venv/bin/activate
      ACTIVATED=true
      echo "Virtual environment activated."
    else
      echo "Warning: uv virtual environment activation script not found. Run 'devenv task run env:clean' and re-enter shell."
    fi
    gpu-check

    


  '';

}
