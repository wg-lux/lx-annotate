{ lxAnnotate, lxAnnotateModule, ... }:
let
  requiredServiceEnvironmentVariables = [
    "DATA_DIR"
    "DJANGO_ALLOWED_HOSTS"
    "DJANGO_CORS_ALLOWED_ORIGINS"
    "DJANGO_CSRF_TRUSTED_ORIGINS"
    "DJANGO_DB_ENGINE"
    "DJANGO_DB_NAME"
    "DJANGO_ENV"
    "DJANGO_HOST"
    "DJANGO_PORT"
    "DJANGO_SECRET_KEY"
    "DJANGO_SETTINGS_MODULE"
    "DJANGO_SETTINGS_MODULE_PRODUCTION"
    "ENDOREG_DEPLOYMENT_ROLE"
    "ENFORCE_AUTH"
    "LX_ANNOTATE_DATA_DIR"
    "LX_ANNOTATE_ENCRYPTED_DATA_DIR"
    "LX_ANNOTATE_STREAMABLE_VIDEO_PROCESSED_ROOT"
    "LX_ANNOTATE_STREAMABLE_VIDEO_RAW_ROOT"
    "LX_ANNOTATE_STREAMABLE_VIDEO_ROOT"
    "LX_DTYPES_HOST_MODELS_MODULE"
    "LX_DTYPES_KB_REGISTRY"
    "LX_DTYPES_TERMINOLOGY_IMPORT_ROOT"
    "MEDIA_URL"
    "NGINX_PROTECTED_MEDIA_URL"
    "PROTECTED_MEDIA_ROOT"
    "SERVE_WITH_NGINX"
    "STATIC_URL"
    "STORAGE_DIR"
    "XDG_DATA_HOME"
  ];
in
{
  suites.service-vm.tests = [
    {
      name = "nixos-service-starts-packaged-server";
      type = "vm";
      vmConfig = {
        nodes.machine =
          { ... }:
          {
            imports = [ lxAnnotateModule ];

            virtualisation = {
              memorySize = 4096;
              cores = 2;
            };

            services.lx-annotate = {
              enable = true;
              package = lxAnnotate;
              settingsModule = "lx_annotate.settings.settings_dev";
              migrate.enable = true;
              idleVideoTranscode = {
                enable = true;
                onCalendar = "*-*-* 03:00:00";
                randomizedDelaySec = "0";
                minFreeBytes = 1073741824;
                maxFiles = 1;
                forceCpu = true;
              };
              extraEnv = {
                DJANGO_DB_ENGINE = "django.db.backends.sqlite3";
                DJANGO_DB_NAME = "/var/lib/lx-annotate/data/runtime-contract.sqlite3";
                DJANGO_SECRET_KEY = "vm-test-secret-key-00000000000000000000000000000000";
                DJANGO_ALLOWED_HOSTS = "127.0.0.1,localhost";
                DJANGO_CSRF_TRUSTED_ORIGINS = "http://127.0.0.1";
                DJANGO_CORS_ALLOWED_ORIGINS = "http://127.0.0.1";
              };
            };

            systemd.tmpfiles.rules = [
              "d /var/lib/lx-annotate 0750 lx-annotate lx-annotate -"
              "d /var/lib/lx-annotate/data 0750 lx-annotate lx-annotate -"
            ];

          };

        testScript =
          # py
          ''
            import shlex

            machine.wait_for_unit("multi-user.target")

            raw_environment = machine.succeed(
                "systemctl show --property=Environment --value lx-annotate.service"
            )
            service_environment = {}
            for assignment in shlex.split(raw_environment):
                name, separator, value = assignment.partition("=")
                if separator:
                    service_environment[name] = value

            required_environment_variables = ${builtins.toJSON requiredServiceEnvironmentVariables}
            missing_environment_variables = sorted(
                set(required_environment_variables) - set(service_environment)
            )
            empty_environment_variables = sorted(
                name
                for name in required_environment_variables
                if name in service_environment and not service_environment[name]
            )
            assert not missing_environment_variables, (
                "lx-annotate.service is missing required environment variables: "
                + ", ".join(missing_environment_variables)
            )
            assert not empty_environment_variables, (
                "lx-annotate.service has empty required environment variables: "
                + ", ".join(empty_environment_variables)
            )
            print("lx-annotate.service runtime environment contract passed")

            machine.wait_for_unit("lx-annotate.service")
            machine.wait_for_open_port(8000)

            machine.succeed("systemctl show -p ExecStart lx-annotate.service | grep -F '${lxAnnotate}/bin/lx-annotate-web'")
            machine.succeed("systemctl cat lx-annotate-idle-video-transcode.service | grep -F '${lxAnnotate}/bin/lx-annotate-manage reconcile_video_formats --repair --in-place --json'")
            machine.succeed("systemctl cat lx-annotate-idle-video-transcode.service | grep -F 'CPUSchedulingPolicy=idle'")
            machine.succeed("systemctl cat lx-annotate-idle-video-transcode.service | grep -F 'IOSchedulingClass=idle'")
            machine.succeed("systemctl cat lx-annotate-idle-video-transcode.timer | grep -F 'OnCalendar=*-*-* 03:00:00'")
            machine.succeed("curl -sf http://127.0.0.1:8000/ >/dev/null || true")
            machine.fail("systemctl cat lx-annotate.service | grep -E 'git |uv sync'")
          '';
      };
    }
    {
      name = "operational-commands-run-from-package";
      type = "vm";
      vmConfig = {
        nodes.machine =
          { pkgs, ... }:
          {
            virtualisation = {
              memorySize = 4096;
              cores = 2;
            };

            systemd.services.lx-annotate-operational-command-contract = {
              description = "Exercise packaged LX-Annotate operational commands";
              wantedBy = [ "multi-user.target" ];
              environment = {
                DATA_DIR = "/run/lx-annotate-command-contract/data";
                DJANGO_DB_ENGINE = "django.db.backends.sqlite3";
                DJANGO_DB_NAME = "/run/lx-annotate-command-contract/db.sqlite3";
                DJANGO_SECRET_KEY = "vm-command-contract-secret-000000000000000000000000";
                DJANGO_SETTINGS_MODULE = "lx_annotate.settings.settings_dev";
                LOG_DIR = "/run/lx-annotate-command-contract/logs";
                LX_ANNOTATE_DATA_DIR = "/run/lx-annotate-command-contract/data";
                LX_ANNOTATE_ENCRYPTED_DATA_DIR = "/run/lx-annotate-command-contract/data";
                MEDIA_ROOT = "/run/lx-annotate-command-contract/media";
                PROTECTED_MEDIA_ROOT = "/run/lx-annotate-command-contract/data/storage";
                STORAGE_DIR = "/run/lx-annotate-command-contract/data/storage";
                XDG_DATA_HOME = "/run/lx-annotate-command-contract/xdg";
              };
              serviceConfig = {
                Type = "oneshot";
                RemainAfterExit = true;
                RuntimeDirectory = "lx-annotate-command-contract";
                ExecStart = pkgs.writeShellScript "lx-annotate-operational-command-contract" ''
                  set -euo pipefail
                  for command in \
                    lx-annotate-recover-data \
                    lx-annotate-bootstrap-terminology \
                    lx-annotate-provision-hub-nodes \
                    lx-annotate-storage-relief \
                    lx-annotate-acceptance
                  do
                    test -x "${lxAnnotate}/bin/$command"
                    "${lxAnnotate}/bin/$command" --help >/dev/null
                  done
                '';
              };
            };
          };

        testScript =
          # py
          ''
            machine.wait_for_unit("lx-annotate-operational-command-contract.service")
            machine.fail("systemctl cat lx-annotate-operational-command-contract.service | grep -F '/home/admin/dev/lx-annotate'")
          '';
      };
    }
  ];
}
