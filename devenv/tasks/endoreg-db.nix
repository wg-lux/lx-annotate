{...}@inputs:
let
  customTasks = {
    "endoreg-db:make-migrations".after = 
      ["devenv:enterShell"]; 

    "endoreg-db:migrate".after = 
      ["endoreg-db:make-migrations"];

    "endoreg-db:load-data".after = 
      ["endoreg-db:migrate"];


    "endoreg-db:make-migrations".exec = 
      "uv run python manage.py makemigrations";
    "endoreg-db:migrate".exec = 
      "uv run python manage.py migrate";
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