{ 
  pkgs, 
  lib, 
  config, 
  inputs, 
  baseBuildInputs, 
  ... }:
let
  appConfig = import ./app_config.nix;

  appName = "lx_annotate";
  DEPLOYMENT_MODE = "dev";

  dataDir = let env = builtins.getEnv "DATA_DIR"; in if env != "" then env else appConfig.paths.data;
  confDir = let env = builtins.getEnv "CONF_DIR"; in if env != "" then env else appConfig.paths.conf;
  confTemplateDir = let env = builtins.getEnv "CONF_TEMPLATE_DIR"; in if env != "" then env else appConfig.paths.confTemplate;

  importDir = let env = builtins.getEnv "IMPORT_DIR"; in if env != "" then env else appConfig.paths.importDir;
  importVideoDir = let env = builtins.getEnv "IMPORT_VIDEO_DIR"; in if env != "" then env else appConfig.paths.videoImportDir;
  importReportDir = let env = builtins.getEnv "REPORT_IMPORT_DIR"; in if env != "" then env else appConfig.paths.reportImportDir;

  homeDir = let env = builtins.getEnv "HOME_DIR"; in if env != "" then env else builtins.getEnv "HOME";
  djangoModuleName = let env = builtins.getEnv "DJANGO_MODULE"; in if env != "" then env else appConfig.app.djangoModule;
  http_protocol = let env = builtins.getEnv "HTTP_PROTOCOL"; in if env != "" then env else appConfig.server.protocol;
  host = let env = builtins.getEnv "DJANGO_HOST"; in if env != "" then env else appConfig.server.host;
  port = let env = builtins.getEnv "DJANGO_PORT"; in if env != "" then env else appConfig.server.port;
  base_url = let env = builtins.getEnv "BASE_URL"; in if env != "" then env else "${http_protocol}://${host}:${port}";

  python = pkgs.python312;
  uvPackage = pkgs.uv;

  devenv_utils = import ./devenv/default.nix {
    pkgs = pkgs;
    lib = lib;
    appConfig = appConfig;
    djangoModuleName = djangoModuleName;
    host = host;
    port = port;
    base_url = base_url;
    dataDir = dataDir;
    confDir = confDir;
    confTemplateDir = confTemplateDir;
    homeDir = homeDir;
    uvPackage = uvPackage;
    isDev = true;
  };

  devTasks = import ./devenv/devTasks/default.nix { inherit config pkgs lib; };

  buildInputs = devenv_utils.buildInputs;
  lxVars = devenv_utils.lx_vars;
  exportLxVars = pkgs.writeText "export-lx-vars.json" (builtins.toJSON lxVars);

  languages.javascript.enable = true;
  languages.javascript.package = pkgs.nodejs_22; # Specify the Node.js version
  languages.python.enable = true;
  languages.python.uv.enable = true;

  commonShellHook = ''
    export PATH="$PATH:$(yarn global bin)"
  '';

  customTasks = ( 
    import ./devenv/tasks/default.nix ({
      inherit config pkgs lib;
    })
  );

  customProcesses = (
    import ./devenv/processes/default.nix ({
       inherit config pkgs lib;
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

  dotenv.enable = true;
  dotenv.disableHint = true;
  packages = devenv_utils.buildInputs ++ [ 
    myTesseract
    pkgs.ollama
    pkgs.git
     ];


  env = {
    # include runtimePackages as well so runtime native libs (e.g. zlib) are on LD_LIBRARY_PATH
    LD_LIBRARY_PATH =
          lib.makeLibraryPath (devenv_utils.buildInputs ++ [myTesseract])
          + ":/run/opengl-driver/lib:/run/opengl-driver-32/lib"
          + ":/usr/lib/wsl/lib"
          + ":/usr/lib/x86_64-linux-gnu"
          + ":/usr/lib"
          ;
    STORAGE_DIR = lib.mkForce dataDir;
    TESSDATA_PREFIX = "${myTesseract}/share/tessdata";
  } // devenv_utils.environment;

  languages.python = {
    enable = true;
    package = pkgs.python312;
    uv = {
      enable = true;
      package = uvPackage;
      sync.enable = true;
    };
  };


  
  tasks = devenv_utils.tasks // (if devenv_utils ? isDev && devenv_utils.isDev then devTasks else {});  
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
        with pkgs; lib.makeLibraryPath (buildInputs)
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

    git submodule init
    # git submodule update --remote --recursive


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



    echo "Exporting environment variables from .env file..."
    if [ -f ".env" ]; then
      set -a
      source .env
      set +a
      echo ".env file loaded successfully."
    else
      echo "Note: .env not found. Defaults apply."
    fi
    # Activate Python virtual environment managed by uv inside of devenv
    ACTIVATED=false
    if [ -f ".devenv/state/venv/bin/activate" ]; then
      source .devenv/state/venv/bin/activate
      ACTIVATED=true
      echo "Virtual environment activated."
    else
      echo "Warning: uv virtual environment activation script not found. Run 'devenv task run env:clean' and re-enter shell."
    fi

    python scripts/core/setup.py --status-only || echo "Warning: Environment setup check failed."
    gpu-check


  '';

}