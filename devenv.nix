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
  ];




  sharedSettings = {
      appName = appName;
      DJANGO_MODULE = appName;
      DJANGO_SETTINGS_MODULE = "${appName}.settings";
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
  dotenv.enable = true;
  dotenv.disableHint = true;

  files."django-settings.json".json = djangoSettings;

  packages = with pkgs; [
    cudaPackages.cuda_nvcc
    stdenv.cc.cc
  ];

  env = {
    DJANGO_MODULE = appName;
    DEPLOYMENT_MODE = DEPLOYMENT_MODE;
    DJANGO_SETTINGS_MODULE = djangoSettings.${DEPLOYMENT_MODE}.DJANGO_SETTINGS_MODULE;
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
    . .devenv/state/venv/bin/activate
  '';

  processes = customProcesses;
  tasks = customTasks;
  scripts = customScripts;

  cachix.enable = true;

}
