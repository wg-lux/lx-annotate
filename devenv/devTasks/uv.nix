{ pkgs, lib, ... }:
{
  "uv:sync" = {
    description = "Synchronize locked Python dependencies including development tools";
    after = [ "devenv:python:uv" ];
    exec = "${lib.getExe pkgs.uv} sync --locked --extra dev --extra docs";
  };
}
