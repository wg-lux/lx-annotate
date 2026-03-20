{ pkgs, ntlib, lxAnnotate, ... }:
[
  {
    name = "packaged-server-wrapper-is-pure";
    type = "script";
    script = ''
      export PATH="${pkgs.lib.makeBinPath [ pkgs.coreutils pkgs.gnugrep ]}"

      test -x ${lxAnnotate}/bin/lx-annotate-server
      test -x ${lxAnnotate}/bin/lx-annotate-manage
      test -f ${lxAnnotate}/share/lx-annotate/staticfiles/.vite/manifest.json

      grep -Fq "${lxAnnotate}/share/lx-annotate/staticfiles" ${lxAnnotate}/bin/lx-annotate-server
      grep -Fq "lx_annotate.settings.settings_prod" ${lxAnnotate}/bin/lx-annotate-server

      if grep -Eq 'git |uv sync|\.venv|\.devenv/state/venv' ${lxAnnotate}/bin/lx-annotate-server; then
        echo "server wrapper still contains mutable runtime setup" >&2
        exit 1
      fi
    '';
  }
]
