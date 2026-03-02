 {
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

  };

  outputs = { self, nixpkgs, flake-utils }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [];
      };

      # Define the common build inputs
      commonBuildInputs = with pkgs; [
        nodejs_22
        yarn
        nodePackages_latest.gulp
        nodePackages_latest.typescript
        vite
        stdenv

      ];

      # Define the shellHook for convenience
      commonShellHook = ''
        export PATH="$PATH:$(yarn global bin)"
      '';

    in
    {
      # Development shell environment
      devShell = pkgs.mkShell {
        buildInputs = commonBuildInputs;
        shellHook = commonShellHook;
      };

      # Default package definition
      defaultPackage = pkgs.stdenv.mkDerivation {
        name = "lx-annotate";
        src = ./lx-annotate;

        buildInputs = commonBuildInputs;
        shellHook = commonShellHook;

        # Define the build phase
        buildPhase = ''
          yarn install
          yarn build
        '';

        # Define the install phase (optional, for copying build artifacts)
        installPhase = ''
          mkdir -p $out
          cp -r * $out/
        '';

        # Define how to run the app
        doInstallCheck = true;
        installCheckPhase = ''
          yarn start
        '';

        # Define the run command for the app
        passthru = {
          run = "${self.defaultPackage}/bin/start";
        };
      };

      # Example of defining other outputs if necessary
      packages = {
        myApp = self.defaultPackage;
      };

      packages.frontend = pkgs.buildNpmPackage { # or buildYarnPackage
        pname = "lx-annotate-frontend";
        version = "1.0.0";
        src = ./frontend; # Path to your vue code

        # Nix needs a hash of your npm dependencies to build offline
        npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; 

        installPhase = ''
          mkdir -p $out
          cp -r dist/* $out/ 
        '';
      };
    }
  );
}
