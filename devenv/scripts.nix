# Scripts configuration for devenv
{ 
  pkgs,
  lib,
  env,
  isDev ? false
}:
let
  # Common server startup logic (DRY) - now uses centralized config
  containerMode = env.containerMode or false;
  djangoHost = env.DJANGO_HOST;
  containerHost = env.containerHost;
  serverStartup = containerMode: let
    serverHost = if containerMode then containerHost else djangoHost;
    hostText = if containerMode then "containerized server" else "server";
  in ''
    # Use unified server script (DRY) and honor runtime env for env.DJANGO_HOST/env.DJANGO_PORT
    export DJANGO_HOST="''${DJANGO_HOST:-${env.DJANGO_HOST}}"
    export DJANGO_PORT="''${DJANGO_PORT:-${env.DJANGO_PORT}}"
    bash scripts/core/server-run.sh
  '';
in
{


  # Database management
  db-shell.exec = ''
    if [ "''${DJANGO_ENV:-development}" = "production" ]; then
      echo "Production mode: Use external database tools"
      echo "Example: psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME>"
    else
      echo "Development mode: Connecting to local SQLite database"
      ${pkgs.uv}/bin/uv run python manage.py dbshell
    fi
  '';


  deploy-pipe.exec = ''
    deploy-migrate
    deploy-load-base-db-data
    deploy-collectstatic
  '';

  gpu-check.exec = "${pkgs.uv}/bin/uv run python scripts/utilities/gpu-check.py";

  # Core utility scripts
  ensure-psql.exec = "${pkgs.uv}/bin/uv run python scripts/database/ensure_psql.py";

  deploy-migrate.exec = "${pkgs.uv}/bin/uv run python manage.py migrate";
  deploy-load-base-db-data.exec = "${pkgs.uv}/bin/uv run python manage.py load_base_db_data";
  deploy-collectstatic.exec = "${pkgs.uv}/bin/uv run python manage.py collectstatic --noinput";
}
