{ pkgs, lib, config, inputs, ... }:
let
  appName = "lx_annotate";
  DEPLOYMENT_MODE = "dev";

  buildInputs = with pkgs; [
    python311Full
    stdenv.cc.cc
    git
    direnv
    nodejs_22
    yarn
    nodePackages_latest.gulp
    libglvnd
    glib
    zlib
    # OpenCV dependencies
    # gtk3
    # gdk-pixbuf
    # cairo
    # pango
    # atk
    # harfbuzz
    # fontconfig
    # freetype
    # libpng
    # libjpeg
    # opencv4
  ];

  # Explicitly define the uv package
  uvPackage = pkgs.uv;

  runtimePackages = with pkgs; [
    cudaPackages.cuda_nvcc # Needed for runtime? Check dependencies
    stdenv.cc.cc
    ffmpeg-headless.bin
    tesseract
    ollama.out
    uvPackage
  ];

  languages.javascript.enable = true;
  languages.javascript.package = pkgs.nodejs_22; # Specify the Node.js version

  # Define the shellHook for convenience
  commonShellHook = ''
    export PATH="$PATH:$(yarn global bin)"
  '';

  # --- Django Project Configuration ---
  DJANGO_MODULE = "lx_annotate";
  host = "localhost";
  port = "8189";

    # --- Directory Structure ---
  dataDir = "endoreg_db/data";
  importDir = "endoreg_db/${dataDir}/import";
  importVideoDir = "endoreg_db/${importDir}/video";
  importReportDir = "endoreg_db/${importDir}/report";
  importLegacyAnnotationDir = "endoreg_db/${importDir}/legacy_annotations";
  exportDir = "endoreg_db/${dataDir}/export";
  exportFramesRootDir = "endoreg_db/${exportDir}/frames";
  exportFramesSampleExportDir = "endoreg_db/${exportFramesRootDir}/test_outputs";
  modelDir = "endoreg_db/${dataDir}/models";
  confDir = "./conf";

  sharedSettings = {
      appName = appName;
      DJANGO_MODULE = appName;
      # DJANGO_SETTINGS_MODULE = "${appName}.settings";
      deploymentMode = DEPLOYMENT_MODE; 
      DJANGO_ALLOWED_HOSTS = ["*"];
    };

  djangoSettings = {
    dev = {
      debug = true;
      port = 8300;
      bind = "127.0.0.1";
    } // sharedSettings;
    prod = {
      debug = false;
      port = 9300;
      bind = "127.0.0.1";
    } // sharedSettings;
  };

  customScripts = (
    import ./devenv/scripts/default.nix ({
      inherit config pkgs lib;
      inherit appName DEPLOYMENT_MODE;
    } // djangoSettings.${DEPLOYMENT_MODE})
  );

  customTasks = ( 
    import ./devenv/tasks/default.nix ({
      inherit config pkgs lib;
    } // djangoSettings.${DEPLOYMENT_MODE})
  );

  customProcesses = (
    import ./devenv/processes/default.nix ({
       inherit config pkgs lib;
    } // djangoSettings.${DEPLOYMENT_MODE})
  );



in
{
  dotenv.enable = false;
  dotenv.disableHint = true;

  files."django-settings.json" = { json = (djangoSettings)."${DEPLOYMENT_MODE}"; };

  packages = runtimePackages ++ (with pkgs; [
    cudaPackages.cuda_nvcc
    stdenv.cc.cc
    nodejs_22
    yarn
    python312Full
    libglvnd
  ] ++ runtimePackages;


  env = {
    DJANGO_MODULE = appName;
    DEPLOYMENT_MODE = DEPLOYMENT_MODE;
    # DJANGO_SETTINGS_MODULE = djangoSettings.${DEPLOYMENT_MODE}.DJANGO_SETTINGS_MODULE;
    LD_LIBRARY_PATH = "${
      with pkgs;
      lib.makeLibraryPath buildInputs
    }:/run/opengl-driver/lib:/run/opengl-driver-32/lib";
  };
  


  languages.python = {
    enable = true;
    uv = {
      enable = true;
      sync.enable = true;
    };
  };

  enterShell = ''


    ENDOREG_DB_DIR="endoreg-db"
    ENDOREG_DB_REPO="https://github.com/wg-lux/endoreg-db"
    ENDOREG_DB_BRANCH="prototype"
    if [ -d "$ENDOREG_DB_DIR" ]; then
      echo "endoreg-db directory exists. Pulling latest changes from $ENDOREG_DB_BRANCH..."
      if [ -f "$ENDOREG_DB_DIR/.git/index.lock" ]; then
        echo "Warning: .git/index.lock exists in $ENDOREG_DB_DIR. Skipping git update to avoid conflicts."
      elif pgrep -f "git.*$ENDOREG_DB_DIR" > /dev/null; then
        echo "Warning: git process running in $ENDOREG_DB_DIR. Skipping git update."
      else
        sleep $((RANDOM % 3))
        (cd "$ENDOREG_DB_DIR" && git fetch origin && git checkout "$ENDOREG_DB_BRANCH" && git reset --hard "origin/$ENDOREG_DB_BRANCH")
      fi
    else
      echo "endoreg-db directory does not exist. Cloning repository..."
      git clone -b "$ENDOREG_DB_BRANCH" "$ENDOREG_DB_REPO" "$ENDOREG_DB_DIR"
    fi

    LX_ANONYMIZER_DIR="$ENDOREG_DB_DIR/lx-anonymizer"
    # check if the directory exists and is empty
    if [ -d "$LX_ANONYMIZER_DIR" ] && [ -z "$(ls -A $LX_ANONYMIZER_DIR)" ]; then
      echo "lx-anonymizer directory exists but is empty. Cloning repository..."
      rm -rf "$LX_ANONYMIZER_DIR"
    fi

    LX_ANONYMIZER_REPO="https://github.com/wg-lux/lx-anonymizer"
    LX_ANONYMIZER_BRANCH="prototype"

    if [ -d "$LX_ANONYMIZER_DIR" ]; then
      echo "lx-anonymizer directory exists. Pulling latest changes from $LX_ANONYMIZER_BRANCH..."
      if [ -f "$LX_ANONYMIZER_DIR/.git/index.lock" ]; then
        echo "Warning: .git/index.lock exists in $LX_ANONYMIZER_DIR. Skipping git update to avoid conflicts."
      elif pgrep -f "git.*$LX_ANONYMIZER_DIR" > /dev/null; then
        echo "Warning: git process running in $LX_ANONYMIZER_DIR. Skipping git update."
      else
        sleep $((RANDOM % 3))
        (cd "$LX_ANONYMIZER_DIR" && git fetch origin && git checkout "$LX_ANONYMIZER_BRANCH" && git reset --hard "origin/$LX_ANONYMIZER_BRANCH")
      fi
    else
      echo "lx-anonymizer directory does not exist. Cloning repository..."
      git clone -b "$LX_ANONYMIZER_BRANCH" "$LX_ANONYMIZER_REPO" "$LX_ANONYMIZER_DIR"
    fi

    # Ensure dependencies are synced using uv
    # Check if venv exists. If not, run sync verbosely. If it exists, sync quietly.
    if [ ! -d ".devenv/state/venv" ]; then
      echo "Virtual environment not found. Running initial uv sync..."
      $SYNC_CMD || echo "Error: Initial uv sync failed. Please check network and pyproject.toml."
    else
      # Sync quietly if venv exists
      echo "Syncing Python dependencies with uv..."
      $SYNC_CMD || echo "Warning: uv sync failed. Environment might be outdated."
    fi

    # Activate Python virtual environment managed by uv
    ACTIVATED=false
    if [ -f ".devenv/state/venv/bin/activate" ]; then
      source .devenv/state/venv/bin/activate
      ACTIVATED=true
      echo "Virtual environment activated."
    else
      echo "Warning: uv virtual environment activation script not found. Please ensure uv sync was successful."
    fi

    . .devenv/state/venv/bin/activate
    uv sync
  '';

  processes = customProcesses;
  tasks = customTasks;
  scripts = {
    export-nix-vars.exec = ''
      cat > .devenv-vars.json << EOF
      {
        "DJANGO_MODULE": "${DJANGO_MODULE}",
        "HOST": "${host}",
        "PORT": "${port}",
        "CONF_DIR": "${confDir}",
        "HOME_DIR": "$HOME",
        "WORKING_DIR": "$PWD"
      }
      EOF
      echo "Exported Nix variables to .devenv-vars.json"
    '';
    
    env-setup.exec = ''
    export LD_LIBRARY_PATH="${
      with pkgs;
      lib.makeLibraryPath buildInputs
    }:/run/opengl-driver/lib:/run/opengl-driver-32/lib"
    '';
    };

  cachix.enable = true;

}
