# Processes configuration for devenv
{ pkgs, lib, env, stateDir, isDev ? false }:
{
  # Unified Django process that adapts to mode
  django = {
    exec = "run-server";
  };
} // lib.optionalAttrs isDev {
  postgres = {
    exec = "${pkgs.postgresql_16}/bin/postgres -D ${lib.escapeShellArg "${stateDir}/postgres"}";
  };
  redis = {
    exec = "${pkgs.redis}/bin/redis-server --bind 127.0.0.1 --port 6380 --appendonly yes --dir ${lib.escapeShellArg "${stateDir}/redis"}";
  };
}
