{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
      "deploy:verify-vite-artifacts" = {
        exec = ''
          set -euo pipefail
          REPO_ROOT="''${WORKING_DIR:-$(pwd)}"
          cd "$REPO_ROOT"
          devenv tasks run vue:build

          static_root="''${DJANGO_STATIC_ROOT:-$REPO_ROOT/staticfiles}"
          if [ "''${static_root%/}" = "$REPO_ROOT/static" ]; then
            echo "Misconfigured DJANGO_STATIC_ROOT: $static_root" >&2
            echo "DJANGO_STATIC_ROOT must not point to $REPO_ROOT/static (Vite source assets)." >&2
            exit 1
          fi
          if [ -L "$static_root" ]; then
            static_root="$(readlink -f "$static_root")"
          fi

          if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
            echo "Not a git checkout; skipping static drift check."
            exit 0
          fi

          if [ "''${static_root%/}" != "$REPO_ROOT/staticfiles" ]; then
            echo "Skipping git static drift check for external DJANGO_STATIC_ROOT=$static_root."
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
