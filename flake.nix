{
  description = "Pure packaged LX-Annotate with Nixtest coverage";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";

    uv2nix.url = "github:pyproject-nix/uv2nix/5d1b2cb4fe3158043fbafbbe2e46238abbc954b0";
    pyproject-nix.url = "github:pyproject-nix/pyproject.nix/b0d513eeeebed6d45b4f2e874f9afba2021f7812";
    pyproject-build-systems.url = "github:pyproject-nix/build-system-pkgs/04e9c186e01f0830dad3739088070e4c551191a4";

    nixtest.url = "gitlab:TECHNOFAB/nixtest?dir=lib";
    nixtest.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    inputs@{
      self,
      nixpkgs,
      flake-utils,
      uv2nix,
      pyproject-nix,
      pyproject-build-systems,
      nixtest,
      ...
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
    in
    {
      nixosModules.default = import ./nix/module.nix;
    }
    // flake-utils.lib.eachSystem systems (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        ntlib = nixtest.lib { inherit pkgs; };

        workspace = uv2nix.lib.workspace.loadWorkspace {
          workspaceRoot = ./.;
        };

        uvOverlay = workspace.mkPyprojectOverlay {
          sourcePreference = "wheel";
        };

        pythonSet =
          (pkgs.callPackage pyproject-nix.build.packages {
            python = pkgs.python312;
          }).overrideScope
            (
              pkgs.lib.composeManyExtensions [
                pyproject-build-systems.overlays.wheel
                uvOverlay
                (
                  final: prev:
                  let
                    setuptoolsBackedPackages = [
                      "antlr4-python3-runtime"
                      "bibtexparser"
                      "django-rest-framework"
                      "encodec"
                      "ffprobe"
                      "googlemaps"
                      "ordereddict"
                      "py-ubjson"
                      "python-environ"
                      "sops"
                      "tesseract"
                    ];
                    withSetuptools =
                      pkg:
                      pkg.overrideAttrs (old: {
                        nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [ final.setuptools ];
                      });
                    withPyprojectMetadata =
                      nativePackage: pyprojectPackage: dependencies:
                      nativePackage.overrideAttrs (old: {
                        passthru = (old.passthru or { }) // {
                          inherit dependencies;
                          optional-dependencies = pyprojectPackage.passthru.optional-dependencies or { };
                          dependency-groups = pyprojectPackage.passthru.dependency-groups or { };
                        };
                      });
                    cudaWheelDependencyNames = [
                      "nvidia-cublas-cu12"
                      "nvidia-cuda-cupti-cu12"
                      "nvidia-cuda-nvrtc-cu12"
                      "nvidia-cuda-runtime-cu12"
                      "nvidia-cudnn-cu12"
                      "nvidia-cufft-cu12"
                      "nvidia-curand-cu12"
                      "nvidia-cusolver-cu12"
                      "nvidia-cusparse-cu12"
                      "nvidia-nccl-cu12"
                      "nvidia-nvjitlink-cu12"
                      "nvidia-nvtx-cu12"
                      "triton"
                    ];
                    torchDependencies = builtins.removeAttrs prev.torch.passthru.dependencies cudaWheelDependencyNames;
                  in
                  pkgs.lib.genAttrs setuptoolsBackedPackages (name: withSetuptools prev.${name})
                  // {
                    numba =
                      withPyprojectMetadata pkgs.python312Packages.numba prev.numba
                        prev.numba.passthru.dependencies;
                    onnxruntime-gpu =
                      withPyprojectMetadata pkgs.python312Packages.onnxruntime prev.onnxruntime-gpu
                        prev.onnxruntime-gpu.passthru.dependencies;
                    torch = withPyprojectMetadata pkgs.python312Packages.torch prev.torch torchDependencies;
                    torchaudio =
                      withPyprojectMetadata pkgs.python312Packages.torchaudio prev.torchaudio
                        prev.torchaudio.passthru.dependencies;
                    torchvision =
                      withPyprojectMetadata pkgs.python312Packages.torchvision prev.torchvision
                        prev.torchvision.passthru.dependencies;
                  }
                )
              ]
            );

        resolvedUvDeps = pythonSet.resolveVirtualEnv workspace.deps.default;

        pythonDeps = builtins.filter (
          drv:
          let
            depName = drv.pname or (pkgs.lib.getName drv);
          in
          depName != "lx-annotate" && depName != "lx_annotate"
        ) resolvedUvDeps;

        frontend = pkgs.callPackage ./frontend/default.nix { };

        runtimeLibs = [
          pkgs.stdenv.cc.cc.lib  # Provides libstdc++.so.6, libgcc_s.so.1, libgomp.so.1
          pkgs.tbb               # Provides libtbb.so
          pkgs.zlib              # Commonly required by data/image processors
          pkgs.glib              # Required if any underlying tools utilize core utilities
        ];

        lx-annotate = pkgs.callPackage ./package.nix {
          inherit runtimeLibs frontend pythonDeps;
        };

        nixtestSuite = ntlib.mkNixtest {
          modules = ntlib.autodiscover { dir = ./nix/tests; };
          args = {
            inherit pkgs ntlib;
            lxAnnotate = lx-annotate;
            lxAnnotateModule = self.nixosModules.default;
          };
        };
      in
      {
        packages = {
          default = lx-annotate;
          inherit frontend lx-annotate;
          nixtest = nixtestSuite;
        };

        apps.default = {
          type = "app";
          program = "${lx-annotate}/bin/lx-annotate-web";
        };

        checks = {
          package = lx-annotate;
          frontend = frontend;
          nixtest = nixtestSuite;
        };
      }
    );
}
