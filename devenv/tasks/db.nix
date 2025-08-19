# devenv/tasks/default.nix
{ pkgs, lib, config, ... }:
{
  "env:export" = {
    description = "Export .env into environment";
    exec = ''set -a; [ -f .env ] && source .env; set +a'';
  };

  "db:load-base-data" = {
    description = "Load base DB data";
    before = [ "devenv:python:uv" "env:export" ];
    # "after" brauchst du hier nicht zwingend
    exec = ''
      set -euo pipefail
      set -a; [ -f .env ] && source .env; set +a
      ${pkgs.uv}/bin/uv run python manage.py load_base_db_data
    '';
    status = ''
      set -a; [ -f .env ] && source .env; set +a
      ${pkgs.uv}/bin/uv run python -c "import django; django.setup(); from endoreg_db.models.administration.center import Center; print(Center.__name__)"
    '';
  };
}
