# nix file importing devenv files
{ 
  pkgs,
  lib,
  appConfig,
  djangoModuleName, 
  host, 
  port, 
  base_url,
  dataDir,
  confDir, 
  confTemplateDir,
  homeDir,
  uvPackage,
  isDev ? false,
}:
let
  # import lx_vars from vars.nix
  # homeDir seems to be read out from root folder default.nix in endoAPI, therefore it is left out devenv/default.nix

  lx_vars = import ./vars.nix {
    dataDir = dataDir;
    confDir = confDir;
    confTemplateDir = confTemplateDir;
    djangoModuleName = djangoModuleName;
    host = host;
    port = port;
    base_url = base_url;
  };
  # import build inputs from build_inputs.nix
  buildInputs = import ./build_inputs.nix { inherit pkgs; };
  runtimePackages = import ./runtime_packages.nix { inherit pkgs uvPackage; };
    # import modular configurations
  scripts = import ./scripts.nix { 
    inherit pkgs lib appConfig djangoModuleName host port isDev; 
  };
  
  services = import ./services.nix { 
    inherit pkgs lib appConfig isDev; 
  };
  
  processes = import ./processes.nix { 
    inherit pkgs lib appConfig isDev; 
  };
  
  environment = import ./environment.nix { 
    lxVars = lx_vars;
    inherit buildInputs runtimePackages pkgs lib isDev appConfig;
  };

  # Import centralized management system
  managementSystem = import ./management.nix { inherit pkgs lib appConfig isDev; };

in 
{
  lx_vars = lx_vars;
  buildInputs = buildInputs;
  runtimePackages = runtimePackages;
  # Integrate centralized management with legacy modular components
  # Unified system: management.nix provides all functionality
  scripts = scripts // managementSystem.scripts;
  tasks = managementSystem.tasks;  # All tasks come from management.nix
  
  services = services;
  processes = processes;
  environment = environment;
}