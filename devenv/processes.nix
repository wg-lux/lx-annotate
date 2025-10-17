# Processes configuration for devenv
{ pkgs, lib, appConfig, isDev ? false }:
{
  # Unified Django process that adapts to mode
  django = {
    exec = "run-server";
  };
}
