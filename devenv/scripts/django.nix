{ config, pkgs, lib, 
  appName, port, deploymentMode,
  bind,
... }@inputs: 
let

  djangoScripts = {
    run-dev-server = {
      exec =''
        ${pkgs.uv}/bin/uv run python manage.py runserver ${bind}:${toString port}
      '';
    };
    run-prod-server = {
      exec = '' 
        ${pkgs.uv}/bin/uv run daphne ${appName}.asgi:application \
        --port=${toString port} --proxy-headers \
        # --bind ${bind} --verbosity=2 \
        # --access-log logs/daphne-access.log
      '';
    };
  };

in djangoScripts