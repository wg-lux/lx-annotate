{ config, pkgs, ... }@inputs:
let
  customProcesses = {
    run_server.exec = "run-${inputs.deploymentMode}-server"; 
    gpu_check.exec = "gpu-check";
    file_watcher.exec = "${pkgs.uv}/bin/uv run python manage.py start_filewatcher --log-level INFO";
  };

in customProcesses