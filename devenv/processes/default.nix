{ config, pkgs, ... }@inputs:
let
  customProcesses = {
    run_server.exec = "run-${inputs.deploymentMode}-server"; 
    gpu_check.exec = "gpu-check";
  };

in customProcesses