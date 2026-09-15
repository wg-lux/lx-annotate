{ lib
, buildNpmPackage
, nodejs_22 ? null
}:

buildNpmPackage rec {
  pname = "lx-annotate-frontend";
  version = "1.2.8";

  src = ./.;

# TODO: On npm deps change, run make packages once with npmDepsHash = lib.fakeHash; 
# then replace lib.fakeHash with the returned "hash in quotes". You can find the hash in the section of the error message:
# specified: the SHA-AA... default
# (fake) got (your real hash)
# Replace lib.fakeHash with the returned hash in default.nix
  npmDepsHash = "sha256-u7XnDtMIOQb91hgHHumnuqesiv6SlJnlbaz9IEjiPaQ=";

  # Keep Nix builds on the same Node/npm toolchain as the development shell.
  # The Nix default Node 20 toolchain rejects this lockfile's optional platform
  # packages, while the project-supported Node 22 toolchain accepts them.
  nodejs = nodejs_22;

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
