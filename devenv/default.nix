# nix file importing devenv files
{ 
  pkgs,
  lib,
  uvPackage,
  isDev ? false,
  env
}:
let

  # import build inputs from build_inputs.nix
  buildInputs = import ./build_inputs.nix { inherit pkgs; };
  runtimePackages = import ./runtime_packages.nix { inherit pkgs uvPackage; };
    # import modular configurations
  scripts = import ./scripts.nix { 
    inherit pkgs lib env isDev; 
  };
  

  processes = import ./processes.nix { 
    inherit pkgs lib env isDev; 
  };
  
  environment = import ./environment.nix { 
    inherit buildInputs runtimePackages pkgs lib isDev env;
  };

  # Import centralized management system
  managementSystem = import ./management.nix { inherit pkgs lib env isDev; };

in 
{
  buildInputs = buildInputs;
  runtimePackages = runtimePackages;
  # Integrate centralized management with legacy modular components
  # Unified system: management.nix provides all functionality
  
  processes = processes;
  environment = environment;
}