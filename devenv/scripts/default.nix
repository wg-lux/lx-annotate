{ 
  config, pkgs, lib, buildInputs,
  deploymentMode ? "dev",
  appName ? "lx_annote",
  bind ? "127.0.0.1",
  port ? 8300,
... }@inputs:

let 

  djangoScripts = (import ./django.nix { 
    inherit config pkgs lib; 
    inherit deploymentMode appName port bind;
  });

  envScripts = import ./env.nix (inputs //{ 
    inherit deploymentMode appName port bind buildInputs;
  });

in
{
  scripts = djangoScripts
            // envScripts
            // {
              gpu-check.exec = "${pkgs.uv}/bin/uv run python gpu-check.py";
              # File watcher scripts  
              start-filewatcher.exec = "${pkgs.uv}/bin/uv run python manage.py start_filewatcher --log-level INFO";
              start-filewatcher-debug.exec = "${pkgs.uv}/bin/uv run python manage.py start_filewatcher --log-level DEBUG";
              test-filewatcher.exec = "${pkgs.uv}/bin/uv run python manage.py start_filewatcher --test";
            };
}