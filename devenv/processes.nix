# Processes configuration for devenv
{ pkgs, lib, env, isDev ? false }:
{
  # Unified Django process that adapts to mode
  django = {
    exec = "run-server";
  };
}
