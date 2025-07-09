{...}@inputs:
let
  customTasks = {

    "env:build" = {
      description = "Generate/update .env file with secrets and config";
      exec = "export-nix-vars && uv run env_setup.py";
      after = ["setup:endoreg-db" "setup:lx-anonymizer"];
      status = "test -f .env && grep -q 'DJANGO_SECRET_KEY=' .env";
    };
    "env:clean" = {
      description = "Remove the uv virtual environment and lock file for a clean sync";
      exec = ''
        echo "Removing uv virtual environment: .devenv/state/venv"
        rm -rf .devenv/state/venv
        echo "Removing uv lock file: uv.lock"
        rm -f uv.lock
        echo "Environment cleaned. Re-enter the shell (e.g., 'exit' then 'devenv up') to trigger uv sync."
      '';
    };
  };
in customTasks
