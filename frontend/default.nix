{ lib
, buildNpmPackage
, nodejs_22 ? null
}:

buildNpmPackage rec {
  pname = "lx-annotate-frontend";
  version = "1.0.0";

  src = ./.;

  npmDepsHash = "sha256-glmUjCW1e/BPNFJLbF10rSXc0vc4jbYDZhPH8GlBLks=";

  npmBuildScript = "build";
  doCheck = false;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"

    # Vite is configured to emit to ../static/dist relative to ./frontend.
    if [ -d ../static/dist ]; then
      cp -r ../static/dist "$out/dist"
    elif [ -d static/dist ]; then
      cp -r static/dist "$out/dist"
    else
      echo "Expected frontend build output in ../static/dist or static/dist" >&2
      exit 1
    fi

    runHook postInstall
  '';

  meta = with lib; {
    description = "Built frontend assets for lx-annotate";
    license = licenses.mit;
  };
}
