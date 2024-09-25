{
  description = "Flake for the Django-based `agl-anonymizer` service with CUDA support";

  inputs = {
    # Use a single nixpkgs input to avoid conflicts
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # poetry2nix should follow the same nixpkgs
    poetry2nix.url = "github:nix-community/poetry2nix";
    poetry2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { nixpkgs, poetry2nix, ... } @ inputs:
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

    pkgs = raw-pkgs.extend poetry2nix.overlays.default;
    lib = pkgs.lib;

    pypkgs-build-requirements = {
      gender-guesser = [ "setuptools" ];
      conllu = [ "setuptools" ];
      janome = [ "setuptools" ];
      pptree = [ "setuptools" ];
      safetensors = [ "maturin" ];
    };

    p2n-overrides = pkgs.poetry2nix.defaultPoetryOverrides.extend (final: prev:
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

    # Define the poetry-based application with CUDA support
    poetryApplication = pkgs.poetry2nix.mkPoetryApplication {
      projectDir = ./.;
      src = lib.cleanSource ./.;
      python = pkgs.python311Full;
      overrides = p2n-overrides;
      nativeBuildInputs = with pkgs; [ pkgs.cudatoolkit ];
      buildInputs = with pkgs; [ pkgs.cudatoolkit ];
    };

  in {
    # Define the development shell
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [ pkgs.cudatoolkit ];
    };

    # Define the package
    packages.${system}.default = poetryApplication;

    # Define the application entry point
    apps.${system}.default = {
      type = "app";
      program = "${poetryApplication}/bin/django-server";
    };
  };
}
