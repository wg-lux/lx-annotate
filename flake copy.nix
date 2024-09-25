{
  description = "Flake for the Django-based `agl-anonymizer` service with CUDA support";

  inputs = {
    # Use a single nixpkgs input to avoid conflicts
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # poetry2nix should follow the same nixpkgs
    poetry2nix.url = "github:nix-community/poetry2nix";
    poetry2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, poetry2nix, ... }:
  let
    system = "x86_64-linux";

    # Import nixpkgs with desired configuration
    pkgs = import nixpkgs {
      inherit system;
      config = {
        allowUnfree = true;
        cudaSupport = true;
      };
    };

    lib = pkgs.lib;

    # Define the poetry-based application with CUDA support
    poetryApplication = poetry2nix.packages.${system}.mkPoetryApplication {
      projectDir = ./.;
      src = lib.cleanSource ./.;
      python = pkgs.python311Full;

      # Include necessary native build inputs
      nativeBuildInputs = with pkgs; [
        stdenv.cc.cc.lib
        autoPatchelfHook
        cudaPackages.cudatoolkit
        cudaPackages.cudnn
        opencv4
        gcc11
        gcc
        libGLU
        libGL
        glibc
        zlib
        glib
        xorg.libXi
        xorg.libXmu
        freeglut
        xorg.libXext
        xorg.libX11
        xorg.libXv
        xorg.libXrandr
        ncurses5
        binutils
        pam
      ];

      # Set environment variables during build using preBuild
      preBuild = ''
        export CUDA_PATH=${pkgs.cudaPackages.cudatoolkit}
        export LD_LIBRARY_PATH="${pkgs.linuxPackages.nvidia_x11}/lib:${pkgs.zlib.out}/lib:${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.libGL}/lib:${pkgs.libGLU}/lib:${pkgs.glib}/lib:${pkgs.glibc}/lib:$LD_LIBRARY_PATH"
        export EXTRA_LDFLAGS="-L/lib -L${pkgs.linuxPackages.nvidia_x11}/lib"
        export EXTRA_CCFLAGS="-I/usr/include"
        export CUDA_NVCC_FLAGS="--compiler-bindir=$(which gcc)"
      '';

      # Handle local dependencies
      poetryOverrides = self: super: {
        # Adjust the path to your local dependency
        "agl-anonymizer-pipeline" = super."agl-anonymizer-pipeline".overridePythonAttrs (old: rec {
          src = ../agl_anonymizer_pipeline;
        });
      };
    };

  in {
    # Define the development shell
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        poetry
        python311Full
        stdenv.cc.cc.lib
        autoPatchelfHook
        cudaPackages.cudatoolkit
        cudaPackages.cudnn
        opencv4
        gcc11
        gcc
        libGLU
        libGL
        glibc
        zlib
        glib
        xorg.libXi
        xorg.libXmu
        freeglut
        xorg.libXext
        xorg.libX11
        xorg.libXv
        xorg.libXrandr
        ncurses5
        binutils
        pam
        nginx
      ];

      # Set environment variables in shellHook
      shellHook = ''
        export CUDA_PATH=${pkgs.cudaPackages.cudatoolkit}
        export LD_LIBRARY_PATH="${pkgs.linuxPackages.nvidia_x11}/lib:${pkgs.zlib.out}/lib:${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.libGL}/lib:${pkgs.libGLU}/lib:${pkgs.glib}/lib:${pkgs.glibc}/lib:$LD_LIBRARY_PATH"
        export EXTRA_LDFLAGS="-L/lib -L${pkgs.linuxPackages.nvidia_x11}/lib"
        export EXTRA_CCFLAGS="-I/usr/include"
        export CUDA_NVCC_FLAGS="--compiler-bindir=$(which gcc)"
      '';
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
