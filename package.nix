{
  lib,
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
  frontend,
  pythonDeps,
}:

let
  python = python312;
  pname = "lx-annotate";
  version = "1.0.0";

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
          "logs/"
          "media/"
          "staticfiles/"
          "storage/"
          "temp/"
        ];
      in
      !(builtins.elem base ignoredBaseNames || lib.any (prefix: lib.hasPrefix prefix rel) ignoredPrefixes);
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
    export LX_ANNOTATE_DATA_DIR="$TMPDIR/app-data"
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

    mkdir -p "$HOME" "$XDG_DATA_HOME" "$LX_ANNOTATE_DATA_DIR"
    chmod -R u+w "$app_dir"
    ${python.interpreter} "$app_dir/manage.py" collectstatic --noinput --clear

    cat > "$out/libexec/lx-annotate-server" <<EOF
#!${stdenv.shell}
set -euo pipefail
cd "$app_dir"
exec ${python.interpreter} -m daphne -b "\''${DJANGO_HOST:-0.0.0.0}" -p "\''${DJANGO_PORT:-8000}" lx_annotate.asgi:application
EOF
    chmod +x "$out/libexec/lx-annotate-server"

    cat > "$out/libexec/lx-annotate-manage" <<EOF
#!${stdenv.shell}
set -euo pipefail
cd "$app_dir"
exec ${python.interpreter} "$app_dir/manage.py" "\$@"
EOF
    chmod +x "$out/libexec/lx-annotate-manage"

    makeWrapper "$out/libexec/lx-annotate-server" "$out/bin/lx-annotate-server" \
      --set-default DJANGO_SETTINGS_MODULE "lx_annotate.settings.settings_prod" \
      --set-default DJANGO_STATIC_ROOT "$static_root" \
      --set-default LX_ANNOTATE_DATA_DIR "/var/lib/lx-annotate" \
      --set-default XDG_DATA_HOME "/var/lib" \
      --set-default TESSDATA_PREFIX "${tesseract}/share/tessdata" \
      --prefix PATH : "${lib.makeBinPath [ ffmpeg-headless ]}" \
      --prefix LD_LIBRARY_PATH : "${runtimeLibraryPath}" \
      --prefix PYTHONPATH : "$app_dir:${dependencyPythonPath}"

    makeWrapper "$out/libexec/lx-annotate-manage" "$out/bin/lx-annotate-manage" \
      --set-default DJANGO_SETTINGS_MODULE "lx_annotate.settings.settings_prod" \
      --set-default DJANGO_STATIC_ROOT "$static_root" \
      --set-default LX_ANNOTATE_DATA_DIR "/var/lib/lx-annotate" \
      --set-default XDG_DATA_HOME "/var/lib" \
      --set-default TESSDATA_PREFIX "${tesseract}/share/tessdata" \
      --prefix PATH : "${lib.makeBinPath [ ffmpeg-headless ]}" \
      --prefix LD_LIBRARY_PATH : "${runtimeLibraryPath}" \
      --prefix PYTHONPATH : "$app_dir:${dependencyPythonPath}"

    runHook postInstall
  '';

  meta = with lib; {
    description = "Pure packaged LX-Annotate application";
    homepage = "https://github.com/wg-lux/lx-annotate";
    license = licenses.mit;
    platforms = platforms.linux;
    mainProgram = "lx-annotate-server";
  };
}
