{
  lib,
  coreutils,
  stdenvNoCC,
  makeWrapper,
  rsync,
  python312,
  ffmpeg-headless,
  tesseract,
  glib,
  libglvnd,
  zlib,
  libxcb,
  stdenv,
  runtimeLibs ? [ ],
  frontend,
  pythonDeps,
}:

let
  python = python312;
  projectMetadata = lib.importTOML ./pyproject.toml;
  pname = projectMetadata.project.name;
  version = projectMetadata.project.version;

  src = lib.cleanSourceWith {
    src = ./.;
    filter =
      path: type:
      let
        rel = lib.removePrefix "${toString ./.}/" (toString path);
        base = builtins.baseNameOf (toString path);
        ignoredBaseNames = [
          ".devenv"
          ".direnv"
          ".git"
          ".mypy_cache"
          ".pytest_cache"
          ".ruff_cache"
          ".venv"
          "__pycache__"
          "node_modules"
        ];
        ignoredPrefixes = [
          "data/"
          "lx-data-models/"
          "logs/"
          "media/"
          "staticfiles/"
          "storage/"
          "temp/"
        ];
      in
      !(
        builtins.elem base ignoredBaseNames || lib.any (prefix: lib.hasPrefix prefix rel) ignoredPrefixes
      );
  };

  runtimeLibraryPath = lib.makeLibraryPath [
    stdenv.cc.cc
    ffmpeg-headless
    glib
    libglvnd
    libxcb
    zlib
  ];

  dependencyPythonPath = lib.makeSearchPath python.sitePackages pythonDeps;
in
stdenvNoCC.mkDerivation {
  inherit pname version src;

  nativeBuildInputs = [
    makeWrapper
    rsync
  ];

  installPhase = ''
        runHook preInstall

        app_dir="$out/share/${pname}/app"
        static_root="$out/share/${pname}/staticfiles"

        mkdir -p "$app_dir" "$static_root" "$out/libexec" "$out/bin"
        rsync -a --delete ./ "$app_dir"/

        rm -rf "$app_dir/static"
        mkdir -p "$app_dir/static"
        cp -r ${frontend}/dist/. "$app_dir/static/"

        export HOME="$TMPDIR/home"
        export XDG_DATA_HOME="$TMPDIR/xdg"
        export LX_ANNOTATE_ENCRYPTED_DATA_DIR="$TMPDIR/app-data"
        export DJANGO_STATIC_ROOT="$static_root"
        export DJANGO_SETTINGS_MODULE="lx_annotate.settings.settings_prod"
        export DJANGO_SECRET_KEY="nix-build-secret-key-00000000000000000000000000000000"
        export DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1"
        export DJANGO_CSRF_TRUSTED_ORIGINS="http://127.0.0.1"
        export DJANGO_CORS_ALLOWED_ORIGINS="http://127.0.0.1"
        export DJANGO_DB_NAME="lx_annotate"
        export DJANGO_DB_USER="lx_annotate"
        export DJANGO_DB_PASSWORD="nix-build-db-password"
        export DJANGO_DB_HOST="localhost"
        export DJANGO_DB_PORT="5432"
        export OIDC_RP_CLIENT_SECRET="nix-build-oidc-secret"
        export ENFORCE_AUTH="0"
        export DJANGO_DEBUG="False"
        export PYTHONPATH="$app_dir:${dependencyPythonPath}"
        export LD_LIBRARY_PATH="${runtimeLibraryPath}"
        export TESSDATA_PREFIX="${tesseract}/share/tessdata"

        mkdir -p "$HOME" "$XDG_DATA_HOME" "$LX_ANNOTATE_ENCRYPTED_DATA_DIR"
        chmod -R u+w "$app_dir"
        ${python.interpreter} "$app_dir/manage.py" collectstatic --noinput --clear
        # Vite owns the frontend asset graph. Copy its dist output into the
        # canonical static root after collectstatic so the django-vite manifest
        # and its referenced assets are preserved exactly.
        cp -r ${frontend}/dist/. "$static_root/"
        vite_entry_file="$(LX_ANNOTATE_STATIC_ROOT="$static_root" ${python.interpreter} -c 'import json, os, sys; from pathlib import Path; static_root = Path(os.environ["LX_ANNOTATE_STATIC_ROOT"]); manifest_path = static_root / ".vite" / "manifest.json"; sys.exit(f"missing Vite manifest: {manifest_path}") if not manifest_path.is_file() else None; manifest = json.loads(manifest_path.read_text(encoding="utf-8")); entry = manifest.get("src/main.ts"); sys.exit("Vite manifest is missing the src/main.ts entry") if not isinstance(entry, dict) else None; entry_file = entry.get("file"); sys.exit("Vite manifest src/main.ts entry is missing its file mapping") if not entry_file else None; print(entry_file)')"
        if [ ! -f "$static_root/$vite_entry_file" ]; then
          echo "Vite manifest src/main.ts points to a missing asset: $static_root/$vite_entry_file" >&2
          exit 1
        fi

        writeCliEntrypoint() {
          local executable="$1"
          local function_name="$2"

          cat > "$out/libexec/$executable" <<EOF
    #!${stdenv.shell}
    set -euo pipefail
    cd "$app_dir"
    exec ${python.interpreter} -c "from lx_annotate.cli import $function_name; raise SystemExit($function_name())" "\$@"
    EOF
          chmod +x "$out/libexec/$executable"
        }

        writeCliEntrypoint lx-annotate-web web
        ln -s lx-annotate-web "$out/libexec/lx-annotate-server"
        writeCliEntrypoint lx-annotate-manage manage
        writeCliEntrypoint lx-annotate-migrate migrate
        writeCliEntrypoint lx-annotate-load-base-data load_base_data
        writeCliEntrypoint lx-annotate-worker worker
        writeCliEntrypoint lx-annotate-celery celery
        writeCliEntrypoint lx-annotate-watch watch
        writeCliEntrypoint lx-annotate-export-frames export_frames
        writeCliEntrypoint lx-annotate-import-sap import_sap

        wrapRuntimeEntrypoint() {
          makeWrapper "$1" "$2" \
            --set-default DJANGO_SETTINGS_MODULE "lx_annotate.settings.settings_prod" \
            --set-default DJANGO_STATIC_ROOT "$static_root" \
            --set-default TESSDATA_PREFIX "${tesseract}/share/tessdata" \
            --prefix PATH : "${lib.makeBinPath [ ffmpeg-headless ]}" \
            --prefix LD_LIBRARY_PATH : "${runtimeLibraryPath}" \
            --prefix PYTHONPATH : "$app_dir:${dependencyPythonPath}"
        }

        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-web" "$out/bin/lx-annotate-web"
        ln -s lx-annotate-web "$out/bin/lx-annotate-server"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-manage" "$out/bin/lx-annotate-manage"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-migrate" "$out/bin/lx-annotate-migrate"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-load-base-data" "$out/bin/lx-annotate-load-base-data"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-worker" "$out/bin/lx-annotate-worker"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-celery" "$out/bin/lx-annotate-celery"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-watch" "$out/bin/lx-annotate-watch"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-export-frames" "$out/bin/lx-annotate-export-frames"
        wrapRuntimeEntrypoint "$out/libexec/lx-annotate-import-sap" "$out/bin/lx-annotate-import-sap"

        runHook postInstall
  '';

  passthru.runtimeEntrypoints = {
    web = "lx-annotate-web";
    manage = "lx-annotate-manage";
    migrate = "lx-annotate-migrate";
    loadBaseData = "lx-annotate-load-base-data";
    worker = "lx-annotate-worker";
    celery = "lx-annotate-celery";
    watch = "lx-annotate-watch";
    exportFrames = "lx-annotate-export-frames";
    importSap = "lx-annotate-import-sap";
    serverAlias = "lx-annotate-server";
  };

  meta = with lib; {
    description = "Pure packaged LX-Annotate application";
    homepage = "https://github.com/wg-lux/lx-annotate";
    license = licenses.mit;
    platforms = platforms.linux;
    mainProgram = "lx-annotate-web";
  };
}
