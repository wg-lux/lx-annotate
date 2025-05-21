{}@inputs:
let
  customTasks = {
    "env:build" = {
      description = "Generate .env only when it doesn't exist";
      after = ["devenv:enterShell"];
      exec = "[ -f .env ] || uv run env_setup.py";
      status = "[ -f .env ]";
    };
    "env:export" = {
      description = "Export the .env file";
      after = ["env:build"];
      exec = "export $(cat .env | xargs)";
    };
  };
in customTasks
