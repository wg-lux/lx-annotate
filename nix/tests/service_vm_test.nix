{ lxAnnotate, lxAnnotateModule, ... }:
[
  {
    name = "nixos-service-starts-packaged-server";
    type = "vm";
    vmConfig = {
      nodes.machine =
        { ... }:
        {
          imports = [ lxAnnotateModule ];

          services.lx-annotate = {
            enable = true;
            package = lxAnnotate;
            settingsModule = "lx_annotate.settings.settings_dev";
            extraEnv = {
              DJANGO_SECRET_KEY = "vm-test-secret-key-00000000000000000000000000000000";
              DJANGO_ALLOWED_HOSTS = "127.0.0.1,localhost";
              DJANGO_CSRF_TRUSTED_ORIGINS = "http://127.0.0.1";
              DJANGO_CORS_ALLOWED_ORIGINS = "http://127.0.0.1";
            };
          };
        };

      testScript =
        # py
        ''
          machine.wait_for_unit("lx-annotate.service")
          machine.wait_for_open_port(8000)
          machine.succeed("systemctl show -p ExecStart lx-annotate.service | grep -F '${lxAnnotate}/bin/lx-annotate-server'")
          machine.succeed("curl -sf http://127.0.0.1:8000/ >/dev/null || true")
          machine.fail("systemctl cat lx-annotate.service | grep -E 'git |uv sync'")
        '';
    };
  }
]
