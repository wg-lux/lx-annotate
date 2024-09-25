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
    version = "0.1.${pkgs.lib.substring 0 8 inputs.self.lastModifiedDate}.${inputs.self.shortRev or "dirty"}";


    # Import nixpkgs with desired configuration
    raw-pkgs = import nixpkgs {
      inherit system;
      config.allowUnfree = true;
      config.cudaSupport = true;    
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
            builtins.map (pkg: if builtins.isString pkg then builtins.getAttr pkg prev else pkg
          ) build-requirements);
        })
      ) pypkgs-build-requirements
    );

    # Define the poetry-based application with CUDA support
    poetryApplication = pkgs.poetry2nix.mkPoetryApplication {
      projectDir = ./.;
      src = lib.cleanSource ./.;
      python = pkgs.python311Full;
      overrides = p2n-overrides;
      # Include necessary native build inputs
      nativeBuildInputs = with pkgs; [];

      # # Handle local dependencies
      # poetryOverrides = self: super: {
      #     # Adjust the path to your local dependency
      #     "agl-anonymizer-pipeline" = super."agl-anonymizer-pipeline".overridePythonAttrs (old: rec {
      #       src = ../agl_anonymizer_pipeline;
      #     });
      #   };
    };

  in {
    # Define the development shell
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [];

      # Set environment variables in shellHook
      # shellHook = '''';
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
