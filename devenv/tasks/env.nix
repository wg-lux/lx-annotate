{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
    "env:fetch-db-pwd-file" = {
      description = "Fetch the database password file";
      exec = "${pkgs.uv}/bin/uv run python scripts/fetch_db_pwd_file.py";
    };
    "env:init-conf" = {
      # after = ["env:psql-pwd-file-exists" "devenv:enterShell"];
      exec = "${pkgs.uv}/bin/uv run python scripts/make_conf.py";
    };
    "env:build" = {
      description = "Build the .env file";
      after = ["env:init-conf"];
      exec = "uv run env_setup.py";
      # status = "test -f .env";
    };
    "env:clean" = {
      description = "Remove the uv virtual environment and lock file for a clean sync";
      exec = ''
        log_status "Removing uv virtual environment: .devenv/state/venv"
        rm -rf .devenv/state/venv
        log_status "Removing uv lock file: uv.lock"
        rm -f uv.lock
        log_status "Environment cleaned. Re-enter the shell (e.g., 'exit' then 'devenv up') to trigger uv sync."
      '';
    };
  };
in customTasks
