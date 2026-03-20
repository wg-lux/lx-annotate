{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
      "deploy:verify-vite-artifacts" = {
        exec = ''
          set -euo pipefail
          REPO_ROOT="''${WORKING_DIR:-$(pwd)}"
          cd "$REPO_ROOT"
          BUILD_PATH="$(${pkgs.nix}/bin/nix build ./frontend#frontend --no-link --print-out-paths)"
          mkdir -p staticfiles
          cp -r "$BUILD_PATH/dist/." staticfiles/

          if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
            echo "Not a git checkout; skipping static drift check."
            exit 0
          fi

          if ! git diff --quiet -- staticfiles || ! git diff --cached --quiet -- staticfiles; then
            echo "staticfiles changed after vue:build. Commit updated frontend artifacts."
            git --no-pager diff --name-only -- staticfiles || true
            exit 1
          fi

          echo "staticfiles artifacts are up to date."
        '';
      };
      "deploy:migrate" = { 
        after = ["deploy:verify-vite-artifacts"];
        exec = "${pkgs.uv}/bin/uv run python manage.py migrate";
      };
      "deploy:load-base-db-data" = {
        after = ["deploy:migrate"];
        exec = "${pkgs.uv}/bin/uv run python manage.py load_base_db_data";
      };
      "deploy:collectstatic" = {
        after = ["deploy:load-base-db-data"];
        exec = "${pkgs.uv}/bin/uv run python manage.py collectstatic --noinput";
      };
      "deploy:full" = {
        exec = ''
          set -euo pipefail
          devenv tasks run deploy:verify-vite-artifacts
          ${pkgs.uv}/bin/uv run python manage.py migrate
          ${pkgs.uv}/bin/uv run python manage.py load_base_db_data || true
          ${pkgs.uv}/bin/uv run python manage.py collectstatic --noinput
          echo "Deploy pipeline complete."
        '';
      };
  };
in customTasks
