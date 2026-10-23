{
  pkgs,
  lxAnnotate,
  lxAnnotateModule,
  ...
}:
let
  evaluate =
    extra:
    (import (pkgs.path + "/nixos/lib/eval-config.nix") {
      system = pkgs.stdenv.hostPlatform.system;
      modules = [
        lxAnnotateModule
        {
          system.stateVersion = "24.11";
          services.lx-annotate = {
            enable = true;
            package = lxAnnotate;
            migrate.enable = true;
            workers = {
              maintenance = { };
              pipeline = { };
              custom.mode = "manual";
            };
            fileWatcher.enable = true;
            fileWatcher.mode = "manual";
            sapImport.enable = true;
            sapImport.mode = "manual";
            exportFrames.enable = true;
            idleVideoTranscode.enable = true;
          };
        }
        extra
      ];
    }).config;
  configured = evaluate { };
  app = configured.services.lx-annotate;
  backgroundUnits = [
    "lx-annotate-celery-worker"
    "lx-annotate-celery-pipeline-worker"
    "lx-annotate-celery-custom-worker"
    "lx-annotate-celery-ffmpeg-media-worker"
    app.fileWatcher.unitName
    app.sapImport.unitName
    app.exportFrames.unitName
    "lx-annotate-idle-video-transcode"
  ];
  foreground = configured.systemd.slices.lx-annotate-foreground.sliceConfig;
  background = configured.systemd.slices.lx-annotate-background.sliceConfig;
  overridden = evaluate {
    systemd.slices.lx-annotate-foreground.sliceConfig.CPUWeight = 2000;
    services.lx-annotate.workers.custom.serviceConfig.Slice = "custom.slice";
  };
  disabled = evaluate { services.lx-annotate.enable = pkgs.lib.mkForce false; };
in
{
  suites.resource-priority.tests = [
    {
      name = "foreground-outranks-all-background-services";
      type = "script";
      script =
        assert
          configured.systemd.services.lx-annotate.serviceConfig.Slice == "lx-annotate-foreground.slice";
        assert builtins.all (
          unit: configured.systemd.services.${unit}.serviceConfig.Slice == "lx-annotate-background.slice"
        ) backgroundUnits;
        assert foreground.CPUWeight > background.CPUWeight;
        assert foreground.IOWeight > background.IOWeight;
        assert !(configured.systemd.services.lx-annotate.serviceConfig ? CPUQuota);
        assert !(configured.systemd.services.lx-annotate-migrate.serviceConfig ? Slice);
        assert !(configured.systemd.services.lx-dtypes-kb-bootstrap.serviceConfig ? Slice);
        assert
          configured.systemd.services.lx-annotate-celery-ffmpeg-media-worker.serviceConfig.CPUQuota == "200%";
        assert configured.systemd.services.lx-annotate-celery-ffmpeg-media-worker.serviceConfig.Nice == 15;
        assert configured.systemd.services.lx-annotate-celery-custom-worker.wantedBy == [ ];
        assert
          configured.systemd.services.lx-annotate-idle-video-transcode.serviceConfig.CPUSchedulingPolicy
          == "idle";
        "${pkgs.coreutils}/bin/true";
    }
    {
      name = "priority-defaults-preserve-host-overrides-and-disabled-service";
      type = "script";
      script =
        assert overridden.systemd.slices.lx-annotate-foreground.sliceConfig.CPUWeight == 2000;
        assert
          overridden.systemd.services.lx-annotate-celery-custom-worker.serviceConfig.Slice == "custom.slice";
        assert !(disabled.systemd.slices ? lx-annotate-foreground);
        assert !(disabled.systemd.slices ? lx-annotate-background);
        "${pkgs.coreutils}/bin/true";
    }
  ];
}
