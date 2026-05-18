{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.lx-annotate;
  idleTranscodeCfg = cfg.idleVideoTranscode;
  effectiveEncryptedDataDir =
    if cfg.encryptedDataDir != "/var/lib/lx-annotate/data" then
      cfg.encryptedDataDir
    else
      cfg.dataDir;
  effectiveStorageDir = "${toString effectiveEncryptedDataDir}/storage";
  effectiveIoDir = toString effectiveEncryptedDataDir;
  commonEnvironment =
    {
      DJANGO_HOST = cfg.host;
      DJANGO_PORT = toString cfg.port;
      DJANGO_SETTINGS_MODULE = cfg.settingsModule;
      ENDOREG_DEPLOYMENT_ROLE = cfg.deploymentRole;
      LX_ANNOTATE_ENCRYPTED_DATA_DIR = toString effectiveEncryptedDataDir;
      LX_ANNOTATE_DATA_DIR = toString effectiveEncryptedDataDir;
      STORAGE_DIR = effectiveStorageDir;
      XDG_DATA_HOME = "/var/lib/lx-annotate";
      ENFORCE_AUTH = "0";
    }
    // cfg.extraEnv;
  rootArgs = lib.concatMap (root: [
    "--root"
    (toString root)
  ]) idleTranscodeCfg.roots;
  extensionArgs = lib.concatMap (extension: [
    "--extension"
    extension
  ]) idleTranscodeCfg.extensions;
  maxFilesArgs = lib.optionals (idleTranscodeCfg.maxFiles != null) [
    "--max-files"
    (toString idleTranscodeCfg.maxFiles)
  ];
  transcodeArgs =
    [
      "reconcile_video_formats"
      "--repair"
      "--in-place"
      "--json"
      "--min-free-bytes"
      (toString idleTranscodeCfg.minFreeBytes)
    ]
    ++ lib.optionals (!idleTranscodeCfg.includeDefaultRoots) [ "--no-default-roots" ]
    ++ lib.optionals idleTranscodeCfg.includeLegacyRoots [ "--include-legacy-roots" ]
    ++ lib.optionals idleTranscodeCfg.forceCpu [ "--force-cpu" ]
    ++ lib.optionals idleTranscodeCfg.failOnNonCompliant [ "--fail-on-non-compliant" ]
    ++ rootArgs
    ++ extensionArgs
    ++ maxFilesArgs;
  idleGate = pkgs.writeShellScript "lx-annotate-idle-video-transcode-gate" ''
    set -euo pipefail

    if ${pkgs.procps}/bin/pgrep -f 'move-my-files|rsync .*move-my-files-staging|lx-annotate-migrate|runLocalMigrate' >/dev/null; then
      echo "lx-annotate idle transcode skipped: competing ingest or migration process is active" >&2
      exit 1
    fi

    read -r load_one _ < /proc/loadavg
    ${pkgs.gawk}/bin/awk \
      -v load="$load_one" \
      -v limit="${idleTranscodeCfg.maxLoadAverage}" \
      'BEGIN { if (load <= limit) exit 0; exit 1 }' || {
        echo "lx-annotate idle transcode skipped: load average $load_one exceeds ${idleTranscodeCfg.maxLoadAverage}" >&2
        exit 1
      }

    available="$(${pkgs.coreutils}/bin/df -PB1 ${lib.escapeShellArg (toString effectiveEncryptedDataDir)} | ${pkgs.gawk}/bin/awk 'NR == 2 { print $4 }')"
    if [ -z "$available" ] || [ "$available" -lt "${toString idleTranscodeCfg.minFreeBytes}" ]; then
      echo "lx-annotate idle transcode skipped: insufficient free space in ${toString effectiveEncryptedDataDir}" >&2
      exit 1
    fi
  '';
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

    deploymentRole = lib.mkOption {
      type = lib.types.enum [
        "central_hub"
        "site_node"
        "standalone"
      ];
      default = "standalone";
      description = ''
        endoreg_db deployment role used by hub-aware ingest policy.
        central_hub enables strict API center scoping and production guardrails.
      '';
    };

    encryptedDataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/lx-annotate/data";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/lx-annotate/data";
      description = "Legacy alias for encryptedDataDir.";
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

    idleVideoTranscode = {
      enable = lib.mkEnableOption "idle, storage-aware video format reconciliation";

      onCalendar = lib.mkOption {
        type = lib.types.str;
        default = "hourly";
        description = "Systemd calendar expression for idle video transcode attempts.";
      };

      randomizedDelaySec = lib.mkOption {
        type = lib.types.str;
        default = "15min";
        description = "Randomized delay applied to the transcode timer.";
      };

      maxLoadAverage = lib.mkOption {
        type = lib.types.str;
        default = "1.5";
        description = "Maximum 1-minute load average allowed before a run starts.";
      };

      minFreeBytes = lib.mkOption {
        type = lib.types.ints.positive;
        default = 40 * 1024 * 1024 * 1024;
        description = "Minimum free bytes required before starting and before each repair.";
      };

      includeDefaultRoots = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Scan canonical managed video roots derived from the configured data directory.";
      };

      roots = lib.mkOption {
        type = lib.types.listOf lib.types.path;
        default = [ ];
        description = "Additional managed roots under the protected or data root to scan.";
      };

      includeLegacyRoots = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Also audit legacy DATA_DIR video roots. Legacy roots remain read-only.";
      };

      extensions = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
        description = "Optional video extensions to scan. Empty uses endoreg_db defaults.";
      };

      maxFiles = lib.mkOption {
        type = lib.types.nullOr lib.types.ints.positive;
        default = null;
        description = "Optional cap on checked video files per run.";
      };

      forceCpu = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Force CPU H.264 encoding instead of automatic encoder selection.";
      };

      failOnNonCompliant = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Fail the service if unresolved video format issues remain.";
      };
    };
  };

  config = lib.mkIf cfg.enable {
    users.groups.${cfg.group} = { };

    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      home = "/var/lib/lx-annotate";
      createHome = true;
    };

    systemd.tmpfiles.rules = [
      "d /var/lib/lx-annotate 0750 ${cfg.user} ${cfg.group} - -"
      "d ${effectiveEncryptedDataDir} 0750 ${cfg.user} ${cfg.group} - -"
      "d ${effectiveEncryptedDataDir}/logs 0750 ${cfg.user} ${cfg.group} - -"
      "d ${effectiveEncryptedDataDir}/media 0750 ${cfg.user} ${cfg.group} - -"
    ];

    systemd.services.lx-annotate = {
      description = "Pure packaged LX-Annotate service";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      environment = commonEnvironment;

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

    systemd.services.lx-annotate-idle-video-transcode = lib.mkIf idleTranscodeCfg.enable {
      description = "Idle storage-aware LX-Annotate video transcoding";
      after = [
        "lx-annotate.service"
        "network.target"
      ];
      wants = [ "lx-annotate.service" ];

      environment = commonEnvironment;

      serviceConfig = {
        Type = "oneshot";
        ExecCondition = idleGate;
        ExecStart = "${cfg.package}/bin/lx-annotate-manage ${lib.escapeShellArgs transcodeArgs}";
        WorkingDirectory = toString effectiveEncryptedDataDir;
        User = cfg.user;
        Group = cfg.group;
        EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;

        Nice = 19;
        IOSchedulingClass = "idle";
        CPUSchedulingPolicy = "idle";
        CPUWeight = 1;
        IOWeight = 1;
        PrivateTmp = true;
        NoNewPrivileges = true;
      };
    };

    systemd.timers.lx-annotate-idle-video-transcode = lib.mkIf idleTranscodeCfg.enable {
      description = "Schedule idle storage-aware LX-Annotate video transcoding";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = idleTranscodeCfg.onCalendar;
        RandomizedDelaySec = idleTranscodeCfg.randomizedDelaySec;
        Persistent = false;
        Unit = "lx-annotate-idle-video-transcode.service";
      };
    };
  };
}
