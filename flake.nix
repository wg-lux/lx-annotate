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
      wikipedia-api = [ "setuptools" ];
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
      python = (pkgs.python3.buildEnv.override {
        extraLibs = with pkgs.python3Packages; [ cudatoolkit ];
      }).env;
      preferWheels = true;
      overrides = p2n-overrides;
      #nativeBuildInputs = with pkgs; [ pkgs.cudaPackages.cudatoolkit ];
      #buildInputs = with pkgs; [ pkgs.cudaPackages.cudatoolkit ];
      #propagatedBuildInputs = with pkgs; [
      #  pkgs.cudaPackages.cudatoolkit   
      #  pkgs.cudaPackages.cudnn
      #  pkgs.linuxPackages.nvidia_x11
      #  pkgs.glibc pkgs.glib
      #  pkgs.libGLU pkgs.libGL
      #  pkgs.xorg.libXi pkgs.xorg.libXmu pkgs.freeglut
      #  pkgs.xorg.libXext pkgs.xorg.libX11 pkgs.xorg.libXv pkgs.xorg.libXrandr pkgs.zlib
      #  pkgs.ncurses5 pkgs.stdenv.cc pkgs.binutils
      #];
      ##postShellHook = ''
      ##  export CUDA_PATH=${pkgs.cudaPackages.cudatoolkit}
      ##  export LD_LIBRARY_PATH="${pkgs.linuxPackages.nvidia_x11}/lib:${pkgs.zlib}/lib:${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.libGL}/lib:${pkgs.libGLU}/lib:${pkgs.glib}/lib:${pkgs.glibc}/lib:$LD_LIBRARY_PATH"
      ##  export EXTRA_LDFLAGS="-L/lib -L${pkgs.linuxPackages.nvidia_x11}/lib"
      ##  export EXTRA_CCFLAGS="-I/usr/include"
      ##  export CC=${pkgs.cudaPackages.cudatoolkit.cc}/bin/gcc CXX=${pkgs.cudaPackages.cudatoolkit.cc}/bin/g++
      ##  export CUDA_NVCC_FLAGS="--compiler-bindir=$(which gcc)"
##
      ##'';
    };

  in {
    # Define the development shell
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [ pkgs.cudaPackages.cudatoolkit ];
      
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
