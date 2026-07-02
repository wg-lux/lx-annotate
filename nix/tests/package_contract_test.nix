{
  pkgs,
  ntlib,
  lxAnnotate,
  ...
}:
let
  expectedVersion = (pkgs.lib.importTOML ../../pyproject.toml).project.version;
in
{
  suites.package-contract.tests = [
    {
      name = "packaged-runtime-entrypoints-are-pure";
      type = "script";
      script = ''
        export PATH="${
          pkgs.lib.makeBinPath [
            pkgs.coreutils
            pkgs.gnugrep
          ]
        }"

        test "${lxAnnotate.name}" = "lx-annotate-${expectedVersion}"

        for command in \
          lx-annotate-web \
          lx-annotate-manage \
          lx-annotate-migrate \
          lx-annotate-load-base-data \
          lx-annotate-worker \
          lx-annotate-watch \
          lx-annotate-export-frames \
          lx-annotate-import-sap \
          lx-annotate-server \
          lx-annotate-celery
        do
          test -x "${lxAnnotate}/bin/$command"
        done

        test -f ${lxAnnotate}/share/lx-annotate/staticfiles/.vite/manifest.json

        grep -Fq "${lxAnnotate}/share/lx-annotate/staticfiles" ${lxAnnotate}/bin/lx-annotate-web
        grep -Fq "lx_annotate.settings.settings_prod" ${lxAnnotate}/bin/lx-annotate-web
        grep -Fq "from lx_annotate.cli import web" ${lxAnnotate}/libexec/lx-annotate-web
        grep -Fq "from lx_annotate.cli import manage" ${lxAnnotate}/libexec/lx-annotate-manage
        grep -Fq "from lx_annotate.cli import migrate" ${lxAnnotate}/libexec/lx-annotate-migrate
        grep -Fq "from lx_annotate.cli import load_base_data" ${lxAnnotate}/libexec/lx-annotate-load-base-data
        grep -Fq "from lx_annotate.cli import worker" ${lxAnnotate}/libexec/lx-annotate-worker
        grep -Fq "from lx_annotate.cli import celery" ${lxAnnotate}/libexec/lx-annotate-celery
        grep -Fq "from lx_annotate.cli import watch" ${lxAnnotate}/libexec/lx-annotate-watch
        grep -Fq "from lx_annotate.cli import export_frames" ${lxAnnotate}/libexec/lx-annotate-export-frames
        grep -Fq "from lx_annotate.cli import import_sap" ${lxAnnotate}/libexec/lx-annotate-import-sap
        test ! -e ${lxAnnotate}/bin/lx-annotate-export_frames
        test "${lxAnnotate.runtimeEntrypoints.celery}" = "lx-annotate-celery"
        if grep -Fq "/var/lib/lx-annotate/data" ${lxAnnotate}/bin/lx-annotate-web; then
          echo "package wrapper hardcodes host data paths" >&2
          exit 1
        fi

        for command in lx-annotate-web lx-annotate-manage lx-annotate-worker lx-annotate-watch lx-annotate-migrate lx-annotate-load-base-data lx-annotate-export-frames lx-annotate-import-sap; do
          if grep -Eq 'git |uv sync|pip install|\.venv|\.devenv/state/venv' \
            "${lxAnnotate}/bin/$command" "${lxAnnotate}/libexec/$command"; then
            echo "$command wrapper still contains mutable runtime setup" >&2
            exit 1
          fi
        done
      '';
    }
  ];
}
