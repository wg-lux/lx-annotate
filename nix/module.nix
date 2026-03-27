{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.lx-annotate;
in
{
  options.services.lx-annotate = {
    enable = lib.mkEnableOption "packaged LX-Annotate service";

    package = lib.mkOption {
      type = lib.types.package;
      description = "Packaged LX-Annotate derivation to run.";
    };

    user = lib.mkOption {
      type = lib.types.str;
      default = "lx-annotate";
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "lx-annotate";
    };

    host = lib.mkOption {
      type = lib.types.str;
      default = "0.0.0.0";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 8000;
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/lx-annotate";
    };

    settingsModule = lib.mkOption {
      type = lib.types.str;
      default = "lx_annotate.settings.settings_prod";
    };

    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
    };

    extraEnv = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
    };
  };

  config = lib.mkIf cfg.enable {
    users.groups.${cfg.group} = { };

    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      home = cfg.dataDir;
      createHome = true;
    };

    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0750 ${cfg.user} ${cfg.group} - -"
      "d ${cfg.dataDir}/logs 0750 ${cfg.user} ${cfg.group} - -"
      "d ${cfg.dataDir}/media 0750 ${cfg.user} ${cfg.group} - -"
    ];

    systemd.services.lx-annotate = {
      description = "Pure packaged LX-Annotate service";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      environment =
        {
          DJANGO_HOST = cfg.host;
          DJANGO_PORT = toString cfg.port;
          DJANGO_SETTINGS_MODULE = cfg.settingsModule;
          LX_ANNOTATE_DATA_DIR = cfg.dataDir;
          XDG_DATA_HOME = cfg.dataDir;
          ENFORCE_AUTH = "0";
        }
        // cfg.extraEnv;

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/lx-annotate-server";
        WorkingDirectory = cfg.dataDir;
        Restart = "on-failure";
        RestartSec = 5;
        User = cfg.user;
        Group = cfg.group;
        EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;
      };
    };
  };
}
