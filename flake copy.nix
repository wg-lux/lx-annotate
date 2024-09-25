{
  description = "Flake for the Django-based `agl-anonymizer` service with CUDA support";

  nixConfig = {
    substituters = [
        "https://cache.nixos.org"
        "https://cuda-maintainers.cachix.org"
      ];
    trusted-public-keys = [
        "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
        "cuda-maintainers.cachix.org-1:0dq3bujKpuEPMCX6U4WylrUDZ9JyUG0VpVZa7CNfq5E="
      ];
    extra-substituters = "https://cache.nixos.org https://nix-community.cachix.org https://cuda-maintainers.cachix.org";
    extra-trusted-public-keys = "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs= cuda-maintainers.cachix.org-1:0dq3bujKpuEPMCX6U4WylrUDZ9JyUG0VpVZa7CNfq5E=";

  };


  inputs = {
    # Use a single nixpkgs input to avoid conflicts
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # poetry2nix should follow the same nixpkgs
    poetry2nix.url = "github:nix-community/poetry2nix";
    poetry2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { nixpkgs, ... } @ inputs:
  let
    system = "x86_64-linux";
    self = inputs.self;

    # Import nixpkgs with desired configuration
    raw-pkgs = import nixpkgs {
      inherit system;
      config = {
        allowUnfree = true;
        cudaSupport = true;
      };
    };

    # pkgs = nixpkgs.legacyPackages.${system};

    # pkgs = raw-pkgs.extend poetry2nix.overlays.default;
    poetry2nix = inputs.poetry2nix.lib.mkPoetry2Nix { inherit pkgs;};

    lib = pkgs.lib;

    pypkgs-build-requirements = {
      gender-guesser = [ "setuptools" ];
      conllu = [ "setuptools" ];
      janome = [ "setuptools" ];
      pptree = [ "setuptools" ];
      wikipedia-api = [ "setuptools" ];
      safetensors = [ "maturin" ];
    };

    p2n-overrides = poetry2nix.defaultPoetryOverrides.extend (final: prev:
      builtins.mapAttrs (package: build-requirements:
        (builtins.getAttr package prev).overridePythonAttrs (old: {
          buildInputs = (old.buildInputs or [ ]) ++ (
            builtins.map (pkg:
              if builtins.isString pkg then builtins.getAttr pkg prev else pkg
            ) build-requirements
          );
        })
      ) pypkgs-build-requirements
      // {
        pytorch = prev.pytorch.override {
          cudaSupport = true;
          cudatoolkit = pkgs.cudatoolkit; # Adjust this version if necessary
        };
      }
    );

    poetryEnv = poetry2nix.mkPoetryEnv {
      projectDir = ./.;
      python = pkgs.python311Full;
      # preferWheels = true;
      overrides = p2n-overrides;



      # extraPackages = (ps: [
      #   ps.torch-bin
      #   ps.torchvision-bin
      #   ps.torchaudio-bin
      # ]);

      # # Example of custom installPhase, passed through until it reaches mkDerivation
      # installPhase = ''
      #   mkdir -p "$out/bin"
      #   echo "#! ${stdenv.shell}" >> "$out/bin/hello"
      #   echo "exec $(which hello)" >> "$out/bin/hello"
      #   chmod 0755 "$out/bin/hello"
      # '';
    };

    # Define the poetry-based application with CUDA support
    poetryApplication = poetry2nix.mkPoetryApplication {
      projectDir = ./.;
      src = lib.cleanSource ./.;
      python = pkgs.python311Full;
      preferWheels = true;
      overrides = p2n-overrides;
      # buildInputs = with pkgs; [
      #   poetryEnv
      #   pkgs.cudaPackages.cudatoolkit
      # ];
    };

  in {
    # Define the development shell
    # devShells.${system}.default = pkgs.mkShell {
    #   buildInputs = with pkgs; [ pkgs.cudaPackages.cudatoolkit ];
    # };

    devShells.${system}.default =  poetryEnv;

    # devShells.${system}.default = pkgs.mkShell {
    #   buildInputs = with pkgs; [
    #     poetryEnv
    #     pkgs.cudaPackages.cudatoolkit
    #   ];
    # };

    # Define the package
    packages.${system}.default = poetryApplication;

    packages.${system}.test = 

    # Define the application entry point
    apps.${system}.default = {
      type = "app";
      program = "${poetryApplication}/bin/django-server";
    };
  };
}
