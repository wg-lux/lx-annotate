# nix file importing devenv files
{ 
  pkgs,
  djangoModuleName, 
  host, 
  port, 
  base_url,
  dataDir,
  confDir, 
  confTemplateDir,
  uvPackage,
}:
let
  # import lx_vars from vars.nix
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

in 
{
  lx_vars = lx_vars;
  buildInputs = buildInputs;
  runtimePackages = runtimePackages;
}