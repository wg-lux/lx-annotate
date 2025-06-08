{}@inputs:
let
  customTasks = {
    # "env:build" = {
    #   description = "Build the .env file";
    #   after = ["devenv:enterShell"];
    #   exec = "uv run env_setup.py";
    #   status = "test -f .env && grep -q 'DJANGO_SECRET_KEY=' .env";
    # };
    # "env:export" = {
    #   description = "Export the .env file";
    #   after = ["env:build"];
    #   exec = "export $(cat .env | xargs)";
    # };
    "env:build" = {
      description = "Generate/update .env file with secrets and config";
      exec = "export-nix-vars && uv run env_setup.py";
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
