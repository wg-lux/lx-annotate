{pkgs, lib, config, ...}@inputs:
let
  customTasks = {
  "git:update-submodules" = {
    description = "Installs newest versions of submodules";
    exec = "git submodule update --remote --merge";
  };

in customTasks