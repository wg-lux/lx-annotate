{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.lx-annotate;
  idleTranscodeCfg = cfg.idleVideoTranscode;
  runtimeEnvironment = import ./runtime-environment.nix { inherit lib; };

  pathOrString = lib.types.either lib.types.path lib.types.str;
  attrsType = lib.types.attrsOf lib.types.anything;

  workerType = lib.types.submodule (
    { name, ... }:
    let
      normalizedName = lib.replaceStrings [ "_" ] [ "-" ] name;
    in
    {
      options = {
        enable = lib.mkEnableOption "LX-Annotate Celery worker" // {
          default = true;
        };

        unitName = lib.mkOption {
          type = lib.types.str;
          default =
            if normalizedName == "maintenance" then
              "lx-annotate-celery-worker"
            else
              "lx-annotate-celery-${normalizedName}-worker";
          description = "systemd service name for this worker, without .service.";
        };

        mode = lib.mkOption {
          type = lib.types.enum [
            "always"
            "manual"
            "timer"
          ];
          default = "always";
          description = "How this worker is started.";
        };

        queues = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = [ normalizedName ];
          description = "Celery queues consumed by this worker.";
        };

        hostname = lib.mkOption {
          type = lib.types.str;
          default = normalizedName;
          description = "Celery worker hostname prefix.";
        };

        concurrency = lib.mkOption {
          type = lib.types.ints.positive;
          default = 1;
        };

        maxTasksPerChild = lib.mkOption {
          type = lib.types.nullOr lib.types.ints.positive;
          default = 1;
        };

        prefetchMultiplier = lib.mkOption {
          type = lib.types.ints.positive;
          default = 1;
        };

        logLevel = lib.mkOption {
          type = lib.types.str;
          default = "INFO";
        };

        extraArgs = lib.mkOption {
          type = lib.types.listOf lib.types.str;
          default = [ ];
        };

        environment = lib.mkOption {
          type = lib.types.attrsOf lib.types.str;
          default = { };
        };

        cudaVisibleDevices = lib.mkOption {
          type = lib.types.nullOr lib.types.str;
          default = null;
        };

        serviceConfig = lib.mkOption {
          type = attrsType;
          default = { };
        };

        onCalendar = lib.mkOption {
          type = lib.types.str;
          default = "*-*-* 22:00:00";
          description = "Timer schedule used when mode = \"timer\".";
        };

        randomizedDelaySec = lib.mkOption {
          type = lib.types.str;
          default = "5m";
        };

        persistentTimer = lib.mkOption {
          type = lib.types.bool;
          default = true;
        };

        runtimeMaxSec = lib.mkOption {
          type = lib.types.nullOr lib.types.str;
          default = null;
        };

        timeoutStopSec = lib.mkOption {
          type = lib.types.str;
          default = "45min";
        };
      };
    }
  );

  effectiveEncryptedDataDir =
    if cfg.encryptedDataDir != "/var/lib/lx-annotate/data" then cfg.encryptedDataDir else cfg.dataDir;
  effectiveEncryptedDataDirString = toString effectiveEncryptedDataDir;

  commonEnvironment =
    runtimeEnvironment.mkAppOwnedEnvironment {
      dataDir = effectiveEncryptedDataDir;
      settingsModule = cfg.settingsModule;
    }
    // runtimeEnvironment.mkHostOwnedEnvironment {
      encryptedDataDir = effectiveEncryptedDataDir;
      host = cfg.host;
      port = cfg.port;
      deploymentRole = cfg.deploymentRole;
      xdgDataHome = cfg.stateDir;
      extra = {
        ENFORCE_AUTH = "0";
      };
    }
    // cfg.extraEnv;

  environmentFileConfig = lib.optionalAttrs (cfg.environmentFile != null) {
    EnvironmentFile = cfg.environmentFile;
  };

  readWritePathConfig = lib.optionalAttrs (cfg.readWritePaths != [ ]) {
    ReadWritePaths = map toString cfg.readWritePaths;
  };

  baseServiceConfig = {
    User = cfg.user;
    Group = cfg.group;
    WorkingDirectory = effectiveEncryptedDataDirString;
    PrivateTmp = true;
    NoNewPrivileges = true;
  }
  // environmentFileConfig
  // readWritePathConfig
  // cfg.extraServiceConfig;

  unitDependencyConfig = cfg.unitDependencies.unitConfig;
  dependencyAfter = cfg.unitDependencies.after;
  dependencyWants = cfg.unitDependencies.wants;
  dependencyRequires = cfg.unitDependencies.requires;

  mkCommand = args: lib.escapeShellArgs args;

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
  transcodeArgs = [
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

    available="$(${pkgs.coreutils}/bin/df -PB1 ${lib.escapeShellArg effectiveEncryptedDataDirString} | ${pkgs.gawk}/bin/awk 'NR == 2 { print $4 }')"
    if [ -z "$available" ] || [ "$available" -lt "${toString idleTranscodeCfg.minFreeBytes}" ]; then
      echo "lx-annotate idle transcode skipped: insufficient free space in ${effectiveEncryptedDataDirString}" >&2
      exit 1
    fi
  '';

  loadBaseDataScript = pkgs.writeShellScript "lx-annotate-load-base-data" ''
    set -euo pipefail
    if ${
      mkCommand ([ "${cfg.package}/bin/lx-annotate-load-base-data" ] ++ cfg.loadBaseData.extraArgs)
    }; then
      exit 0
    fi
    ${
      if cfg.loadBaseData.failOnError then
        ''
          exit 1
        ''
      else
        ''
          echo "lx-annotate load-base-data failed; continuing after successful migrations." >&2
          exit 0
        ''
    }
  '';

  watcherArgs = lib.optionals cfg.fileWatcher.once [ "--once" ] ++ cfg.fileWatcher.extraArgs;
  watcherPathConfig = {
    Unit = "${cfg.fileWatcher.unitName}.service";
  }
  // lib.optionalAttrs (cfg.fileWatcher.paths != [ ]) {
    PathChanged = map toString cfg.fileWatcher.paths;
  }
  // lib.optionalAttrs (cfg.fileWatcher.pathGlobs != [ ]) {
    PathExistsGlob = cfg.fileWatcher.pathGlobs;
  };

  sapDropDir =
    if cfg.sapImport.dropDir != null then
      toString cfg.sapImport.dropDir
    else
      "${effectiveEncryptedDataDirString}/import/sap_import";
  sapProcessedDir =
    if cfg.sapImport.processedDir != null then
      toString cfg.sapImport.processedDir
    else
      "${effectiveEncryptedDataDirString}/import/sap_import_processed";
  sapFailedDir =
    if cfg.sapImport.failedDir != null then
      toString cfg.sapImport.failedDir
    else
      "${effectiveEncryptedDataDirString}/import/sap_import_failed";
  sapOutputDir =
    if cfg.sapImport.outputDir != null then
      toString cfg.sapImport.outputDir
    else
      "${effectiveEncryptedDataDirString}/import/preanonymized_import";
  sapImportScript = pkgs.writeShellScript "lx-annotate-sap-import" ''
    set -euo pipefail

    sap_drop_dir=${lib.escapeShellArg sapDropDir}
    sap_processed_dir=${lib.escapeShellArg sapProcessedDir}
    sap_failed_dir=${lib.escapeShellArg sapFailedDir}
    sap_output_dir=${lib.escapeShellArg sapOutputDir}
    ${pkgs.coreutils}/bin/install -d -m 0770 "$sap_drop_dir" "$sap_processed_dir" "$sap_failed_dir" "$sap_output_dir"

    wait_for_stable_zip() {
      local file_path="$1"
      local previous_size="-1"
      local stable_checks=0
      local current_size=""

      for _ in $(${pkgs.coreutils}/bin/seq 1 ${toString cfg.sapImport.stableAttempts}); do
        if [ ! -f "$file_path" ]; then
          return 1
        fi
        current_size="$(${pkgs.coreutils}/bin/stat -c %s "$file_path" 2>/dev/null || echo -1)"
        if [ "$current_size" = "$previous_size" ]; then
          stable_checks=$((stable_checks + 1))
          if [ "$stable_checks" -ge ${toString cfg.sapImport.stableChecks} ]; then
            return 0
          fi
        else
          stable_checks=0
          previous_size="$current_size"
        fi
        ${pkgs.coreutils}/bin/sleep ${toString cfg.sapImport.stableIntervalSec}
      done
      return 1
    }

    shopt -s nullglob
    for zip_path in "$sap_drop_dir"/*.zip; do
      zip_name="$(${pkgs.coreutils}/bin/basename "$zip_path")"
      if ! wait_for_stable_zip "$zip_path"; then
        echo "SAP import zip did not become stable in time: $zip_path" >&2
        continue
      fi

      if ${cfg.package}/bin/lx-annotate-import-sap "$zip_path" --output_dir "$sap_output_dir" ${lib.escapeShellArgs cfg.sapImport.extraArgs}; then
        ${pkgs.coreutils}/bin/mv "$zip_path" "$sap_processed_dir/$zip_name"
      else
        echo "SAP import failed for $zip_path" >&2
        ${pkgs.coreutils}/bin/mv "$zip_path" "$sap_failed_dir/$zip_name"
      fi
    done
  '';
  sapPathConfig = {
    Unit = "${cfg.sapImport.unitName}.service";
  }
  // lib.optionalAttrs (cfg.sapImport.pathGlobs != [ ]) {
    PathExistsGlob = cfg.sapImport.pathGlobs;
  };

  exportFramesOutputDir =
    if cfg.exportFrames.outputDir != null then
      toString cfg.exportFrames.outputDir
    else
      "${effectiveEncryptedDataDirString}/storage/export/frames";

  mkBaseService =
    {
      description,
      after ? [ ],
      wants ? [ ],
      requires ? [ ],
      before ? [ ],
      wantedBy ? [ "multi-user.target" ],
      environment ? { },
      unitConfig ? { },
      serviceConfig ? { },
      restartTriggers ? [ cfg.package ],
    }:
    {
      inherit description restartTriggers;
      after = [ "network.target" ] ++ dependencyAfter ++ after;
      wants = dependencyWants ++ wants;
      requires = dependencyRequires ++ requires;
      inherit before wantedBy;
      unitConfig = unitDependencyConfig // unitConfig;
      environment = commonEnvironment // environment;
      serviceConfig = baseServiceConfig // serviceConfig;
    };

  mkTimer = unitName: timerCfg: {
    description = timerCfg.description;
    wantedBy = [ "timers.target" ];
    timerConfig = {
      Unit = "${unitName}.service";
      OnCalendar = timerCfg.onCalendar;
      RandomizedDelaySec = timerCfg.randomizedDelaySec;
      Persistent = timerCfg.persistent;
    };
  };

  mkWorkerService =
    name: workerCfg:
    let
      queueArg = lib.concatStringsSep "," workerCfg.queues;
      maxTasksArgs = lib.optionals (workerCfg.maxTasksPerChild != null) [
        "--max-tasks-per-child=${toString workerCfg.maxTasksPerChild}"
      ];
      workerArgs = [
        "--hostname=${workerCfg.hostname}@%%h"
        "--queues=${queueArg}"
        "--concurrency=${toString workerCfg.concurrency}"
        "--prefetch-multiplier=${toString workerCfg.prefetchMultiplier}"
      ]
      ++ maxTasksArgs
      ++ workerCfg.extraArgs;
      workerEnvironment =
        workerCfg.environment
        // {
          CELERY_LOG_LEVEL = workerCfg.logLevel;
          OMP_NUM_THREADS = "1";
          OPENBLAS_NUM_THREADS = "1";
          MKL_NUM_THREADS = "1";
          NUMEXPR_NUM_THREADS = "1";
          MALLOC_ARENA_MAX = "2";
        }
        // lib.optionalAttrs (workerCfg.cudaVisibleDevices != null) {
          CUDA_VISIBLE_DEVICES = workerCfg.cudaVisibleDevices;
        };
    in
    lib.nameValuePair workerCfg.unitName (
      lib.mkIf workerCfg.enable (mkBaseService {
        description = "LX-Annotate Celery worker ${name}";
        wantedBy = lib.optionals (workerCfg.mode == "always") [ "multi-user.target" ];
        after =
          lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ]
          ++ lib.optionals (cfg.migrate.enable && !cfg.loadBaseData.enable) [ "lx-annotate-migrate.service" ];
        wants = lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ];
        requires =
          lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ]
          ++ lib.optionals (cfg.migrate.enable && !cfg.loadBaseData.enable) [ "lx-annotate-migrate.service" ];
        environment = workerEnvironment;
        serviceConfig = {
          ExecStart = mkCommand ([ "${cfg.package}/bin/lx-annotate-worker" ] ++ workerArgs);
          Restart = if workerCfg.mode == "always" then "on-failure" else "no";
          RestartSec = 5;
          TimeoutStopSec = workerCfg.timeoutStopSec;
        }
        // lib.optionalAttrs (workerCfg.runtimeMaxSec != null) {
          RuntimeMaxSec = workerCfg.runtimeMaxSec;
        }
        // workerCfg.serviceConfig;
      })
    );

  defaultFfmpegMediaWorkers = lib.optionalAttrs (cfg.workers != { }) {
    ffmpeg_media = {
      queues = [ "ffmpeg_media" ];
      hostname = "ffmpeg-media";
      concurrency = 1;
      prefetchMultiplier = 1;
      maxTasksPerChild = 1;
      timeoutStopSec = "2h";
      serviceConfig = {
        MemoryHigh = "8G";
        MemoryMax = "12G";
        CPUQuota = "200%";
        Nice = 15;
        IOSchedulingClass = "best-effort";
        IOSchedulingPriority = 7;
        OOMScoreAdjust = 750;
      };
    };
  };
  effectiveWorkers = defaultFfmpegMediaWorkers // cfg.workers;
  workerServices = lib.listToAttrs (lib.mapAttrsToList mkWorkerService effectiveWorkers);
  workerTimers = lib.listToAttrs (
    lib.mapAttrsToList (
      name: workerCfg:
      lib.nameValuePair workerCfg.unitName (
        lib.mkIf (workerCfg.enable && workerCfg.mode == "timer") (
          mkTimer workerCfg.unitName {
            description = "Schedule LX-Annotate Celery worker ${name}";
            inherit (workerCfg) onCalendar randomizedDelaySec;
            persistent = workerCfg.persistentTimer;
          }
        )
      )
    ) effectiveWorkers
  );
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

    stateDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/lx-annotate";
      description = "Writable service state root used for XDG_DATA_HOME and the service home.";
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

    readWritePaths = lib.mkOption {
      type = lib.types.listOf pathOrString;
      default = [ ];
      description = "Writable paths granted to all lx-annotate app-owned services.";
    };

    extraServiceConfig = lib.mkOption {
      type = attrsType;
      default = { };
      description = "Common systemd serviceConfig merged into all lx-annotate app-owned services.";
    };

    unitDependencies = {
      after = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      wants = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      requires = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      unitConfig = lib.mkOption {
        type = attrsType;
        default = { };
      };
    };

    migrate = {
      enable = lib.mkEnableOption "LX-Annotate database migrations";

      extraArgs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      timeoutStartSec = lib.mkOption {
        type = lib.types.str;
        default = "10min";
      };
    };

    loadBaseData = {
      enable = lib.mkEnableOption "LX-Annotate base-data loading";

      extraArgs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      failOnError = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Fail the unit when load_base_db_data exits non-zero.";
      };

      timeoutStartSec = lib.mkOption {
        type = lib.types.str;
        default = "10min";
      };
    };

    workers = lib.mkOption {
      type = lib.types.attrsOf workerType;
      default = { };
      description = ''
        Celery workers generated from declarative workload data.
        If any workers are configured, a bounded ffmpeg_media worker is added
        by default for asynchronous video re-import work unless overridden with
        workers.ffmpeg_media.
      '';
    };

    fileWatcher = {
      enable = lib.mkEnableOption "LX-Annotate file watcher";

      unitName = lib.mkOption {
        type = lib.types.str;
        default = "lx-annotate-filewatcher";
      };

      mode = lib.mkOption {
        type = lib.types.enum [
          "path"
          "service"
          "manual"
        ];
        default = "path";
      };

      once = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Run the watcher in process-existing-once mode.";
      };

      paths = lib.mkOption {
        type = lib.types.listOf pathOrString;
        default = [ ];
        description = "Directories that trigger the path unit via PathChanged.";
      };

      pathGlobs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
        description = "Glob patterns that trigger the path unit via PathExistsGlob.";
      };

      extraArgs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };
    };

    sapImport = {
      enable = lib.mkEnableOption "LX-Annotate SAP IS-H ZIP import";

      unitName = lib.mkOption {
        type = lib.types.str;
        default = "lx-annotate-sap-import";
      };

      mode = lib.mkOption {
        type = lib.types.enum [
          "path"
          "timer"
          "manual"
        ];
        default = "path";
      };

      dropDir = lib.mkOption {
        type = lib.types.nullOr pathOrString;
        default = null;
      };

      processedDir = lib.mkOption {
        type = lib.types.nullOr pathOrString;
        default = null;
      };

      failedDir = lib.mkOption {
        type = lib.types.nullOr pathOrString;
        default = null;
      };

      outputDir = lib.mkOption {
        type = lib.types.nullOr pathOrString;
        default = null;
      };

      pathGlobs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      extraArgs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      stableAttempts = lib.mkOption {
        type = lib.types.ints.positive;
        default = 20;
      };

      stableChecks = lib.mkOption {
        type = lib.types.ints.positive;
        default = 2;
      };

      stableIntervalSec = lib.mkOption {
        type = lib.types.ints.positive;
        default = 2;
      };

      onCalendar = lib.mkOption {
        type = lib.types.str;
        default = "*:0/15";
      };

      randomizedDelaySec = lib.mkOption {
        type = lib.types.str;
        default = "30s";
      };

      persistentTimer = lib.mkOption {
        type = lib.types.bool;
        default = false;
      };
    };

    exportFrames = {
      enable = lib.mkEnableOption "LX-Annotate frame export job";

      unitName = lib.mkOption {
        type = lib.types.str;
        default = "lx-annotate-export-frames";
      };

      mode = lib.mkOption {
        type = lib.types.enum [
          "manual"
          "timer"
        ];
        default = "manual";
      };

      outputDir = lib.mkOption {
        type = lib.types.nullOr pathOrString;
        default = null;
      };

      extraArgs = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };

      onCalendar = lib.mkOption {
        type = lib.types.str;
        default = "daily";
      };

      randomizedDelaySec = lib.mkOption {
        type = lib.types.str;
        default = "10m";
      };

      persistentTimer = lib.mkOption {
        type = lib.types.bool;
        default = false;
      };
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
    assertions = [
      {
        assertion =
          !cfg.fileWatcher.enable
          || cfg.fileWatcher.mode != "path"
          || cfg.fileWatcher.paths != [ ]
          || cfg.fileWatcher.pathGlobs != [ ];
        message = "services.lx-annotate.fileWatcher in path mode requires paths or pathGlobs.";
      }
      {
        assertion = !cfg.sapImport.enable || cfg.sapImport.mode != "path" || cfg.sapImport.pathGlobs != [ ];
        message = "services.lx-annotate.sapImport in path mode requires pathGlobs.";
      }
    ];

    users.groups.${cfg.group} = { };

    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      home = cfg.stateDir;
      createHome = true;
    };

    systemd.tmpfiles.rules = [
      "d ${toString cfg.stateDir} 0750 ${cfg.user} ${cfg.group} - -"
      "d ${effectiveEncryptedDataDirString} 0750 ${cfg.user} ${cfg.group} - -"
      "d ${effectiveEncryptedDataDirString}/logs 0750 ${cfg.user} ${cfg.group} - -"
      "d ${effectiveEncryptedDataDirString}/media 0750 ${cfg.user} ${cfg.group} - -"
    ]
    ++ lib.optionals cfg.sapImport.enable [
      "d ${sapDropDir} 0770 ${cfg.user} ${cfg.group} - -"
      "d ${sapProcessedDir} 0770 ${cfg.user} ${cfg.group} - -"
      "d ${sapFailedDir} 0770 ${cfg.user} ${cfg.group} - -"
      "d ${sapOutputDir} 0770 ${cfg.user} ${cfg.group} - -"
    ]
    ++ lib.optionals cfg.exportFrames.enable [
      "d ${exportFramesOutputDir} 0770 ${cfg.user} ${cfg.group} - -"
    ];

    systemd.services = {
      lx-annotate = mkBaseService {
        description = "Packaged LX-Annotate web service";
        after =
          lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ]
          ++ lib.optionals (cfg.migrate.enable && !cfg.loadBaseData.enable) [ "lx-annotate-migrate.service" ];
        wants = lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ];
        requires =
          lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ]
          ++ lib.optionals (cfg.migrate.enable && !cfg.loadBaseData.enable) [ "lx-annotate-migrate.service" ];
        serviceConfig = {
          ExecStart = "${cfg.package}/bin/lx-annotate-web";
          Restart = "on-failure";
          RestartSec = 5;
        };
      };

      lx-annotate-migrate = lib.mkIf cfg.migrate.enable (mkBaseService {
        description = "Apply LX-Annotate database migrations";
        before = [
          "lx-annotate.service"
        ]
        ++ lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ];
        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
          ExecStart = mkCommand ([ "${cfg.package}/bin/lx-annotate-migrate" ] ++ cfg.migrate.extraArgs);
          TimeoutStartSec = cfg.migrate.timeoutStartSec;
        };
      });

      lx-annotate-load-base-data = lib.mkIf cfg.loadBaseData.enable (mkBaseService {
        description = "Load LX-Annotate base data";
        after = lib.optionals cfg.migrate.enable [ "lx-annotate-migrate.service" ];
        wants = lib.optionals cfg.migrate.enable [ "lx-annotate-migrate.service" ];
        requires = lib.optionals cfg.migrate.enable [ "lx-annotate-migrate.service" ];
        before = [ "lx-annotate.service" ];
        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
          ExecStart = loadBaseDataScript;
          TimeoutStartSec = cfg.loadBaseData.timeoutStartSec;
        };
      });

      "${cfg.fileWatcher.unitName}" = lib.mkIf cfg.fileWatcher.enable (mkBaseService {
        description = "Run LX-Annotate file watcher";
        wantedBy = lib.optionals (cfg.fileWatcher.mode == "service") [ "multi-user.target" ];
        after =
          lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ]
          ++ lib.optionals (cfg.migrate.enable && !cfg.loadBaseData.enable) [ "lx-annotate-migrate.service" ];
        wants = lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ];
        requires =
          lib.optionals cfg.loadBaseData.enable [ "lx-annotate-load-base-data.service" ]
          ++ lib.optionals (cfg.migrate.enable && !cfg.loadBaseData.enable) [ "lx-annotate-migrate.service" ];
        serviceConfig = {
          Type = if cfg.fileWatcher.once then "oneshot" else "simple";
          ExecStart = mkCommand ([ "${cfg.package}/bin/lx-annotate-watch" ] ++ watcherArgs);
          Restart = if cfg.fileWatcher.once then "no" else "on-failure";
          RestartSec = 5;
        };
      });

      "${cfg.sapImport.unitName}" = lib.mkIf cfg.sapImport.enable (mkBaseService {
        description = "Import LX-Annotate SAP IS-H ZIP drops";
        wantedBy = [ ];
        serviceConfig = {
          Type = "oneshot";
          ExecStart = sapImportScript;
          TimeoutStartSec = "infinity";
        };
      });

      "${cfg.exportFrames.unitName}" = lib.mkIf cfg.exportFrames.enable (mkBaseService {
        description = "Export LX-Annotate frames";
        wantedBy = [ ];
        environment = {
          LX_ANNOTATE_EXPORT_FRAMES_OUTPUT_DIR = exportFramesOutputDir;
        };
        serviceConfig = {
          Type = "oneshot";
          ExecStart = mkCommand (
            [ "${cfg.package}/bin/lx-annotate-export-frames" ] ++ cfg.exportFrames.extraArgs
          );
          TimeoutStartSec = "infinity";
        };
      });

      lx-annotate-idle-video-transcode = lib.mkIf idleTranscodeCfg.enable (mkBaseService {
        description = "Idle storage-aware LX-Annotate video transcoding";
        after = [ "lx-annotate.service" ];
        wants = [ "lx-annotate.service" ];
        serviceConfig = {
          Type = "oneshot";
          ExecCondition = idleGate;
          ExecStart = mkCommand ([ "${cfg.package}/bin/lx-annotate-manage" ] ++ transcodeArgs);
          Nice = 19;
          IOSchedulingClass = "idle";
          CPUSchedulingPolicy = "idle";
          CPUWeight = 1;
          IOWeight = 1;
        };
      });
    }
    // workerServices;

    systemd.paths = {
      "${cfg.fileWatcher.unitName}" =
        lib.mkIf (cfg.fileWatcher.enable && cfg.fileWatcher.mode == "path")
          {
            description = "Watch LX-Annotate intake directories";
            wantedBy = [ "multi-user.target" ];
            pathConfig = watcherPathConfig;
          };

      "${cfg.sapImport.unitName}" = lib.mkIf (cfg.sapImport.enable && cfg.sapImport.mode == "path") {
        description = "Watch LX-Annotate SAP import drops";
        wantedBy = [ "multi-user.target" ];
        pathConfig = sapPathConfig;
      };
    };

    systemd.timers = {
      lx-annotate-idle-video-transcode = lib.mkIf idleTranscodeCfg.enable {
        description = "Schedule idle storage-aware LX-Annotate video transcoding";
        wantedBy = [ "timers.target" ];
        timerConfig = {
          OnCalendar = idleTranscodeCfg.onCalendar;
          RandomizedDelaySec = idleTranscodeCfg.randomizedDelaySec;
          Persistent = false;
          Unit = "lx-annotate-idle-video-transcode.service";
        };
      };

      "${cfg.sapImport.unitName}" = lib.mkIf (cfg.sapImport.enable && cfg.sapImport.mode == "timer") (
        mkTimer cfg.sapImport.unitName {
          description = "Schedule LX-Annotate SAP import scans";
          inherit (cfg.sapImport) onCalendar randomizedDelaySec;
          persistent = cfg.sapImport.persistentTimer;
        }
      );

      "${cfg.exportFrames.unitName}" =
        lib.mkIf (cfg.exportFrames.enable && cfg.exportFrames.mode == "timer")
          (
            mkTimer cfg.exportFrames.unitName {
              description = "Schedule LX-Annotate frame exports";
              inherit (cfg.exportFrames) onCalendar randomizedDelaySec;
              persistent = cfg.exportFrames.persistentTimer;
            }
          );
    }
    // workerTimers;
  };
}
