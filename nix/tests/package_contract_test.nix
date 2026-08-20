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
          lx-annotate-recover-data \
          lx-annotate-provision-hub-nodes \
          lx-annotate-storage-relief \
          lx-annotate-acceptance \
          lx-annotate-server \
          lx-annotate-celery \
          lx-dtypes-kb-registry
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
        grep -Fq "from lx_annotate.cli import recover_data" ${lxAnnotate}/libexec/lx-annotate-recover-data
        grep -Fq "from lx_dtypes.scripts.kb_registry import main" ${lxAnnotate}/libexec/lx-dtypes-kb-registry
        grep -Fq "from lx_annotate.cli import provision_hub_nodes" ${lxAnnotate}/libexec/lx-annotate-provision-hub-nodes
        grep -Fq "from lx_annotate.cli import storage_relief" ${lxAnnotate}/libexec/lx-annotate-storage-relief
        grep -Fq "from lx_annotate.cli import acceptance" ${lxAnnotate}/libexec/lx-annotate-acceptance
        test ! -e ${lxAnnotate}/bin/lx-annotate-export_frames
        test ! -e ${lxAnnotate}/bin/lx-annotate-bootstrap-terminology
        test "${lxAnnotate.runtimeEntrypoints.celery}" = "lx-annotate-celery"
        test "${lxAnnotate.runtimeEntrypoints.knowledgeBaseRegistry}" = "lx-dtypes-kb-registry"
        if grep -Fq "/var/lib/lx-annotate/data" ${lxAnnotate}/bin/lx-annotate-web; then
          echo "package wrapper hardcodes host data paths" >&2
          exit 1
        fi

        for command in lx-annotate-web lx-annotate-manage lx-annotate-worker lx-annotate-watch lx-annotate-migrate lx-annotate-load-base-data lx-annotate-export-frames lx-annotate-import-sap lx-annotate-recover-data lx-annotate-provision-hub-nodes lx-annotate-storage-relief lx-annotate-acceptance lx-dtypes-kb-registry; do
          if grep -Eq 'git |uv sync|pip install|\.venv|\.devenv/state/venv' \
            "${lxAnnotate}/bin/$command" "${lxAnnotate}/libexec/$command"; then
            echo "$command wrapper still contains mutable runtime setup" >&2
            exit 1
          fi
        done

        contract_root="$TMPDIR/lx-annotate-package-contract"
        mkdir -p \
          "$contract_root/data/storage" \
          "$contract_root/logs" \
          "$contract_root/media" \
          "$contract_root/xdg"
        export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
        export DJANGO_SECRET_KEY=package-contract-secret-000000000000000000000000
        export DATA_DIR="$contract_root/data"
        export LX_ANNOTATE_DATA_DIR="$contract_root/data"
        export LX_ANNOTATE_ENCRYPTED_DATA_DIR="$contract_root/data"
        export STORAGE_DIR="$contract_root/data/storage"
        export PROTECTED_MEDIA_ROOT="$contract_root/data/storage"
        export MEDIA_ROOT="$contract_root/media"
        export LOG_DIR="$contract_root/logs"
        export XDG_DATA_HOME="$contract_root/xdg"

        for command in \
          lx-annotate-recover-data \
          lx-annotate-provision-hub-nodes \
          lx-annotate-storage-relief \
          lx-annotate-acceptance
        do
          ${lxAnnotate}/bin/$command --help >/dev/null
        done
        ${lxAnnotate}/bin/lx-dtypes-kb-registry bootstrap --help >/dev/null

        if grep -R -Fq "/home/admin/dev/lx-annotate" \
          ${lxAnnotate}/bin \
          ${lxAnnotate}/libexec \
          ${lxAnnotate}/share/lx-annotate/app/lx_annotate; then
          echo "packaged runtime references the development checkout" >&2
          exit 1
        fi
      '';
    }
  ];
}
