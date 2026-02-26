{ lib
, python312
, ffmpeg-headless
, tesseract
, glib
, libglvnd
, zlib
, xorg
, stdenv
, secretspec
, frontend ? null
, pythonDeps ? [ ]
}:

let
  python = python312;
in
python.pkgs.buildPythonApplication rec {
  pname = "lx-annotate";
  version = "1.0.0";
  pyproject = true;

  src = ./.;

  nativeBuildInputs = with python.pkgs; [
    hatchling
  ];

  postPatch = ''
    # The project currently omits PEP 517 build-system metadata; add it for nix builds.
    if ! grep -q '^\[build-system\]' pyproject.toml; then
      cat >> pyproject.toml <<'EOF'

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
EOF
    fi
  '';

  # Native dependencies (non-python) that must be available at runtime
  # This mirrors your 'runtimePackages' in devenv.nix
  buildInputs = [
    stdenv.cc.cc
    glib
    zlib
    libglvnd
    xorg.libxcb
  ];

  # Python dependencies (Mapping your uv extras/requirements)
  propagatedBuildInputs = pythonDeps ++ (with python.pkgs; [
    # Keep lightweight fallback(s) here; prefer passing uv2nix-generated deps via `pythonDeps`.
    django
  ]);

  # This replicates your LD_LIBRARY_PATH logic from devenv.nix
  makeWrapperArgs = [
    "--prefix LD_LIBRARY_PATH : ${lib.makeLibraryPath [ 
        stdenv.cc.cc 
        glib 
        zlib 
        libglvnd 
        xorg.libxcb 
        ffmpeg-headless 
      ]}"
    "--set TESSDATA_PREFIX ${tesseract}/share/tessdata"
  ];

  # We skip tests if they require the database/network which isn't available in the Nix sandbox
  doCheck = false;
  # uv2nix should satisfy runtime deps; until then, this check fails because pyproject lists many deps.
  pythonRuntimeDepsCheckHook = null;

  postInstall = ''
    mkdir -p "$out/share/${pname}"
    cp secretspec.toml "$out/share/${pname}/secretspec.toml"

    ${lib.optionalString (frontend != null) ''
      mkdir -p "$out/${python.sitePackages}/static"
      cp -r ${frontend}/dist "$out/${python.sitePackages}/static/"
    ''}

    mkdir -p "$out/bin"
    cat > "$out/bin/${pname}-with-secrets" <<EOF
#!${stdenv.shell}
set -euo pipefail
cd "$out/share/${pname}"
exec ${secretspec}/bin/secretspec run --provider env -- "\$@"
EOF
    chmod +x "$out/bin/${pname}-with-secrets"

    cat > "$out/bin/${pname}-manage" <<EOF
#!${stdenv.shell}
set -euo pipefail
export DJANGO_SETTINGS_MODULE="''${DJANGO_SETTINGS_MODULE:-lx_annotate.settings.settings_prod}"
export PYTHONPATH="$out/${python.sitePackages}:''${PYTHONPATH:-}"
cd "$out/share/${pname}"
exec ${secretspec}/bin/secretspec run --provider env -- \
  ${python.interpreter} -m django "\$@"
EOF
    chmod +x "$out/bin/${pname}-manage"
  '';

  meta = with lib; {
    description = "LX Annotate Local Service";
    homepage = "https://github.com/your-org/lx-annotate";
    license = licenses.mit;
  };
}
