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
  frontendHashScript = ''
      set -euo pipefail
      REPO_ROOT="''${WORKING_DIR:-$(pwd)}"
      cd "$REPO_ROOT"

      (
        if [ -d "frontend/src" ]; then
          find frontend/src -type f -print0
        fi
        if [ -d "frontend/public" ]; then
          find frontend/public -type f -print0
        fi
        for f in \
          frontend/package.json \
          frontend/package-lock.json \
          frontend/vite.config.ts \
          frontend/vite.config.js \
          frontend/vitest.config.ts \
          frontend/tsconfig.app.json \
          frontend/default.nix \
          frontend/flake.nix \
          frontend/devenv.nix \
          frontend/devenv.yaml
        do
          if [ -f "$f" ]; then
            printf '%s\0' "$f"
          fi
        done
      ) | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}'
      '';
  customTasks = {
    "vue:build".after =
      [ "uv:sync" ];

    "vue:build".exec =
      vueBuildExec;

    "vue:build".execIfModified = [
      "frontend/src"
      "frontend/public"
      "frontend/package.json"
      "frontend/package-lock.json"
      "frontend/vite.config.ts"
      "frontend/vite.config.js"
      "frontend/vitest.config.ts"
      "frontend/tsconfig.app.json"
      "frontend/default.nix"
      "frontend/flake.nix"
      "frontend/devenv.nix"
      "frontend/devenv.yaml"
    ];

    "vue:build-on-enter-shell" = {
      before = [ "devenv:enterShell" ];
      after = [ "uv:sync" ];
      exec = ''
        ${vueBuildExec}
        mkdir -p .devenv/state
        FRONTEND_HASH="$(${frontendHashScript})"
        echo "$FRONTEND_HASH" > .devenv/state/vue.build.stamp
      '';
      status = ''
        set -euo pipefail
        [ -f "staticfiles/.vite/manifest.json" ] || exit 1
        [ -f ".devenv/state/vue.build.stamp" ] || exit 1

        CURRENT_HASH="$(${frontendHashScript})"
        PREV_HASH="$(cat .devenv/state/vue.build.stamp)"
        [ "$CURRENT_HASH" = "$PREV_HASH" ]
      '';
    };
  };

in customTasks
