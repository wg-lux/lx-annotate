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
        stdenv
        nodejs_22
        yarn
        nodePackages_latest.gulp

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
        name = "frontend";
        src = ./frontend;

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
        # Assuming you have a start script defined in package.json
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

      # Optionally, you can define tests or other outputs
      # apps = {};
      # checks = {};
    }
  );
}