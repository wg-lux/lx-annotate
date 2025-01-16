{ 
  config, pkgs, lib, 
  deploymentMode ? "dev",
  appName ? "lx_webapp",
  bind ? "127.0.0.1",
  port ? 8300,  
... }@inputs:

let 

  djangoScripts = (import ./django.nix { 
    inherit config pkgs lib; 
    inherit deploymentMode appName port bind;
  });

  customScripts =  {
    gpu-check.exec = "${pkgs.uv}/bin/uv run python gpu-check.py";
  } // djangoScripts; 

in customScripts