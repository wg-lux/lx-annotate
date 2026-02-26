let
  devenvFlakeDef = import ./.devenv.flake.nix;
  devenvInputs = builtins.mapAttrs (_: spec: builtins.getFlake spec.url) devenvFlakeDef.inputs;
  devenvOutputs = devenvFlakeDef.outputs devenvInputs;

  uv2nixFlake = builtins.getFlake "github:pyproject-nix/uv2nix/5d1b2cb4fe3158043fbafbbe2e46238abbc954b0";
  pyprojectNixFlake = builtins.getFlake "github:pyproject-nix/pyproject.nix/b0d513eeeebed6d45b4f2e874f9afba2021f7812";
  pyprojectBuildSystemsFlake = builtins.getFlake "github:pyproject-nix/build-system-pkgs/04e9c186e01f0830dad3739088070e4c551191a4";

  system =
    if builtins ? currentSystem && builtins.currentSystem != null
    then builtins.currentSystem
    else "x86_64-linux";

  devenvProject = devenvOutputs.devenv.perSystem.${system};
  pkgs = devenvProject.project._module.args.pkgs;
  frontendBuild = pkgs.callPackage ./frontend/default.nix { };

  workspace = uv2nixFlake.lib.workspace.loadWorkspace {
    workspaceRoot = ./.;
  };

  uvOverlay = workspace.mkPyprojectOverlay {
    sourcePreference = "wheel";
  };

  pythonSet =
    (pkgs.callPackage pyprojectNixFlake.build.packages {
      python = pkgs.python312;
    }).overrideScope
      (
        pkgs.lib.composeManyExtensions [
          pyprojectBuildSystemsFlake.overlays.wheel
          uvOverlay
        ]
      );

  resolvedUvDeps = pythonSet.resolveVirtualEnv workspace.deps.default;

  pythonDeps =
    builtins.filter
      (drv:
        let
          depName = drv.pname or (pkgs.lib.getName drv);
        in
          depName != "lx-annotate" && depName != "lx_annotate")
      resolvedUvDeps;

in
pkgs.callPackage ./default.nix {
  frontend = frontendBuild;
  pythonDeps = pythonDeps;
}
