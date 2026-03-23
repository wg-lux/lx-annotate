{pkgs, lib, config, ...}@inputs:
let
  vueBuildExec = ''
      set -euo pipefail
      REPO_ROOT="''${WORKING_DIR:-$(pwd)}"
      cd "$REPO_ROOT"

      BUILD_PATH="$(${pkgs.nix}/bin/nix build ./frontend#frontend --no-link --print-out-paths)"

      mkdir -p staticfiles
      cp -r "$BUILD_PATH/dist/." staticfiles/
      '';
  customTasks = {
    "vue:build".after = 
      ["uv:sync"];
    
    "vue:build".exec = 
      vueBuildExec;
      
    "vue:build".before = 
      ["devenv:enterShell"];
    "vue:build".execIfModified = [
      "frontend"
      "frontend/package.json"
      "frontend/package-lock.json"
      "frontend/default.nix"
      "frontend/flake.nix"
      "frontend/devenv.nix"
      "frontend/devenv.yaml"
    ];
  };

in customTasks
