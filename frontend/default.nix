{ lib
, buildNpmPackage
, nodejs_22 ? null
}:

buildNpmPackage rec {
  pname = "lx-annotate-frontend";
  version = "1.0.0";

  src = ./.;

  npmDepsHash = "sha256-gFyVehSwVatoPJnel6OSbV2mYRbG3Fbk5/aooeEzzhw=";

  npmBuildScript = "build";
  doCheck = false;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/dist"

    # Vite is configured to emit to ../staticfiles relative to ./frontend.
    if [ -d ../staticfiles ]; then
      cp -r ../staticfiles/. "$out/dist/"
    elif [ -d staticfiles ]; then
      cp -r staticfiles/. "$out/dist/"
    else
      echo "Expected frontend build output in ../staticfiles or staticfiles" >&2
      exit 1
    fi

    runHook postInstall
  '';

  meta = with lib; {
    description = "Built frontend assets for lx-annotate";
    license = licenses.mit;
  };
}
