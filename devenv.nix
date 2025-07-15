{ pkgs, lib, config, inputs, ... }:
let
  appName = "lx_annotate";
  DEPLOYMENT_MODE = "dev";

  buildInputs = with pkgs; [
    stdenv.cc.cc
    git
    direnv
    nodejs_22
    yarn
    nodePackages_latest.gulp
    libglvnd
    glib
    zlib
    gnumake
    cmake
    gcc
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
      inherit config pkgs lib buildInputs;
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

  imports = [
    ./endoreg-db/devenv.nix
    ./endoreg-db/lx-anonymizer/devenv.nix
    ./frontend/flake.nix
  ];

in
{
  dotenv.enable = false;
  dotenv.disableHint = true;

  files."django-settings.json" = { json = (djangoSettings)."${DEPLOYMENT_MODE}"; };

  packages = with pkgs; [
    cudaPackages.cuda_nvcc
    stdenv.cc.cc
    nodejs_22
    yarn
    libglvnd
    inotify-tools 
    python312Packages.inotify-simple
    python312Packages.watchdog
    ffmpeg_6-headless
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
    package = pkgs.python312Full;
    uv = {
      enable = true;
      sync.enable = false;
    };
  };

  enterShell = 
    ''
    . .devenv/state/venv/bin/activate
    '';
  
  tasks = customTasks;

  processes = customProcesses;
  
  # Import scripts from the scripts module
  scripts = customScripts.scripts // {
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