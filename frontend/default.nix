{ lib
, buildNpmPackage
, nodejs_22 ? null
}:

buildNpmPackage rec {
  pname = "lx-annotate-frontend";
  version = "1.0.0";

  src = ./.;

# TODO: On npm deps change, run make packages once with npmDepsHash = lib.fakeHash; 
# then replace lib.fakeHash with the returned "hash in quotes". You can find the hash in the section of the error message:
# specified: the SHA-AA... default
# (fake) got (your real hash)
# Replace lib.fakeHash with the returned hash in default.nix
  npmDepsHash = "sha256-LrgNC8KIvVscTxLDxrghnSWujxYDNpd2+G4y/TT1q58=";

  npmBuildScript = "build";
  doCheck = false;

  installPhase = ''
    # NEVER CHANGE THIS UNLESS YOU KNOW WHAT YOUR DOING: IT IS NEEDED IN WHEEL DEPLOYMENTS
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
