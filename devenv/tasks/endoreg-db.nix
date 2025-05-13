{...}@inputs:
let
  customTasks = {


 
    "endoreg-db:init-db".after =
     [ "devenv:enterShell" ];

    "endoreg-db:load-data".after = 
     ["endoreg-db:init-db"];
    

    "endoreg-db:init-db".exec = ''
      cd endoreg-db
      direnv allow
      '';

    "endoreg-db:migrate" = {
      exec = ''
        cd endoreg-db
        devenv build
      '';
      after = [ "endoreg-db:load-data" ];
    };


    "endoreg-db:load-data".exec =  ''
      if [ -f .env ]; then
        if grep -q "INITIALIZE_DB=True" .env; then
          echo "INITIALIZE_DB=True found in .env file. Running uv run python manage.py load_base_db_data"
          uv run python manage.py load_base_db_data
          # set INITIALIZE_DB=False in .env file
          sed -i 's/INITIALIZE_DB=True/INITIALIZE_DB=False/' .env
        elif grep -q "INITIALIZE_DB=False" .env; then
          echo "INITIALIZE_DB=False found in .env file. Database is expected to be loaded."
        else
          echo "INITIALIZE_DB not found in .env file. Running uv run python manage.py load_base_db_data"
          uv run python manage.py load_base_db_data
          # append new line with INITIALIZE_DB=False to .env file
          echo "INITIALIZE_DB=False" >> .env
        fi
      else
        echo "INITIALIZE_DB not found in .env file. Running uv run python manage.py load_base_db_data"
        uv run python manage.py load_base_db_data
        echo "INITIALIZE_DB=False" >> .env
      fi
    '';
  };

in customTasks