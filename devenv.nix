
{ 
  pkgs, 
  lib, 
  config, 
  inputs, 
  baseBuildInputs, 
  ... }:
let
  appName = "lx_annotate";
  secret = name: default: config.secretspec.secrets.${name} or default;
  runtimeEnvironment = import ./nix/runtime-environment.nix { inherit lib; };
  secretspecEncryptedDataDir = secret "LX_ANNOTATE_ENCRYPTED_DATA_DIR" "";
  runtimeDataDir =
    if secretspecEncryptedDataDir == "" then secret "DATA_DIR" "data" else secretspecEncryptedDataDir;

  DEPLOYMENT_MODE = "prod";

  packages = [
    pkgs.stdenv.cc.cc.lib # Provides libstdc++.so.6
  ];
  python = pkgs.python312;
  uvPackage = pkgs.uv;
  env.LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ];
  devTasks = import ./devenv/devTasks/default.nix { inherit config pkgs lib; env=baseEnv; };

  languages.javascript.enable = true;
  languages.javascript.package = pkgs.nodejs_22; # Specify the Node.js version
  languages.python.enable = true;
  languages.python.uv.enable = true;

  isDev = if config.secretspec.secrets.DJANGO_ENV == "development" then true else false;

  # 1. DEFINE STATIC ENV VARS HERE
  baseEnv = runtimeEnvironment.mkAppOwnedEnvironment {
    dataDir = runtimeDataDir;
    settingsModule = config.secretspec.secrets.DJANGO_SETTINGS_MODULE;
    djangoEnv = config.secretspec.secrets.DJANGO_ENV;
    staticUrl = config.secretspec.secrets.STATIC_URL;
    protectedMediaUrl = config.secretspec.secrets.NGINX_PROTECTED_MEDIA_URL;
    mediaUrl = config.secretspec.secrets.MEDIA_URL;
    serveWithNginx = config.secretspec.secrets.SERVE_WITH_NGINX;
  } // {

    # --- Directories & Paths ---
    containerHost = "None";
    containerMode = false;
    LX_ANNOTATE_ENCRYPTED_DATA_DIR = runtimeDataDir;
    EXPORT_OUTPUT_DIR = config.secretspec.secrets.EXPORT_OUTPUT_DIR;
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
    DJANGO_SETTINGS_MODULE_DEVELOPMENT = config.secretspec.secrets.DJANGO_SETTINGS_MODULE_DEVELOPMENT;
    DJANGO_DEBUG = config.secretspec.secrets.DJANGO_DEBUG;
    VITE_ENABLE_DEBUG = secret "VITE_ENABLE_DEBUG" "false";
    TIME_ZONE = config.secretspec.secrets.TIME_ZONE;
    DEFAULT_CENTER = config.secretspec.secrets.CENTER_NAME;
    LX_DTYPES_HOST_MODELS_MODULE = "endoreg_db.integrations.lx_dtypes_host_models";

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
    DJANGO_CORS_ALLOWED_ORIGINS = config.secretspec.secrets.DJANGO_CORS_ALLOWED_ORIGINS;
    # --- Watcher Dirs ---
    WATCHER_VIDEO_DIR = config.secretspec.secrets.WATCHER_VIDEO_DIR;
    WATCHER_REPORT_DIR = config.secretspec.secrets.WATCHER_REPORT_DIR;
    WATCHER_PREANONYMIZED_DIR = config.secretspec.secrets.WATCHER_PREANONYMIZED_DIR;
    FFMPEG_TRANSCODE_TIMEOUT_SECONDS = config.secretspec.secrets.FFMPEG_TRANSCODE_TIMEOUT_SECONDS;
    FFMPEG_EXECUTABLE = config.secretspec.secrets.FFMPEG_EXECUTABLE;
    FFMPEG_BINARY = config.secretspec.secrets.FFMPEG_BINARY;
    FFMPEG_PATH = config.secretspec.secrets.FFMPEG_PATH;
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
       inherit config pkgs lib baseEnv;
    })
  );

  myTesseract = pkgs.tesseract.override {
    enableLanguages = [ "eng" "deu" ];
  };

  # Ollama pulls CUDA-linked dependencies in this nixpkgs snapshot.
  # We keep it opt-in so shell evaluation remains reliable on non-CUDA setups.
  enableOllama = builtins.getEnv "DEVENV_ENABLE_OLLAMA" == "1";

  runtimePackages = with pkgs; [
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
  ] ++ lib.optionals enableOllama [ ollama.out ];

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
  secretspec.provider = "env";

  dotenv.enable = false;
  dotenv.disableHint = true;
  packages = lib.unique (devenv_utils.buildInputs ++ runtimePackages);

  env = baseEnv // {
    UV_PROJECT_ENVIRONMENT = lib.mkForce ".devenv/state/venv";
    LD_LIBRARY_PATH = runtimeLibraryPath;
    TESSDATA_PREFIX = "${myTesseract}/share/tessdata";
    PYTORCH_ALLOC_CONF= "expandable_segments:True";
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

  } // devenv_utils.scripts;

  enterShell = lib.mkAfter ''



    mkdir -p "${baseEnv.STORAGE_DIR}"
    mkdir -p "${config.secretspec.secrets.ASSET_DIR}"
    mkdir -p "${config.secretspec.secrets.HOME_DIR}"
    mkdir -p "${config.secretspec.secrets.WORKING_DIR}"
    mkdir -p "${config.secretspec.secrets.DJANGO_STATIC_ROOT}"


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
    echo "Virtual environment activated."

  '';
}
