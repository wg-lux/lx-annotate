{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
      "deploy:migrate" = { 
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
  };
in customTasks
