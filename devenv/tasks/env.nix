{}@inputs:
let
  customTasks = {
    "env:build" = {
      description = "Build the .env file";
      after = ["devenv:enterShell"];
      exec = "uv run env_setup.py";
      status = "test -f .env && grep -q 'DJANGO_SECRET_KEY=' .env";
    };
    "env:export" = {
      description = "Export the .env file";
      after = ["env:build"];
      exec = "export $(cat .env | xargs)";
    };
  };
in customTasks
