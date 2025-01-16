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
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

    # poetry2nix should follow the same nixpkgs
    poetry2nix.url = "github:nix-community/poetry2nix";
    poetry2nix.inputs.nixpkgs.follows = "nixpkgs";

    agl_anonymizer_pipeline.url = "github:wg-lux/agl_anonymizer_pipeline";
    agl_anonymizer_pipeline.inputs.nixpkgs.follows = "nixpkgs";

    cachix = {
      url = "github:cachix/cachix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { nixpkgs, cachix, agl_anonymizer_pipeline, ... } @ inputs:


  let
    # Define the C++ toolchain with Clang and GCC
    clangVersion = "16";   # Version of Clang
    gccVersion = "13";     # Version of GCC
    llvmPkgs = pkgs."llvmPackages_${clangVersion}";  # LLVM toolchain
    gccPkg = pkgs."gcc${gccVersion}";  # GCC package for compiling

    # Create a clang toolchain with libstdc++ from GCC
    clangStdEnv = pkgs.stdenvAdapters.overrideCC llvmPkgs.stdenv (llvmPkgs.clang.override {
      gccForLibs = gccPkg;  # Link Clang with libstdc++ from GCC
    });

    anonymizer_dir = "/etc/agl-anonymizer";
    anonymizer_temp_dir = "/etc/agl-anonymizer-temp";

    anonymizer_config = {
      anonymizer_temp_dir = anonymizer_temp_dir;
      anonymizer_dir = anonymizer_dir;
      settings_module = "agl_anonymizer.settings";
      temp_dir = "${anonymizer_temp_dir}/temp";
      blurred_dir = "${anonymizer_dir}/blurred_results";
      csv_dir = "${anonymizer_dir}/csv_training_data";
      results_dir = "${anonymizer_dir}/results";
      models_dir = "${anonymizer_dir}/models";
      # needs to be implemented
      input_dir = "${anonymizer_dir}/input";
      
    };
    service-user = "root";
    service-group = "root";
 
    dirSetupScript = pkgs.writeShellScriptBin "setup-agl-anonymizer-directory" ''
        # Ensure the main directory exists
        if [ ! -d "${anonymizer_config.anonymizer_dir}" ]; then
            mkdir -p "${anonymizer_dir}"
        fi
        if [ ! -d "${anonymizer_config.temp_dir}" ]; then
            mkdir -p "${anonymizer_config.temp_dir}"
        fi

        if [ ! -d "${anonymizer_config.blurred_dir}" ]; then
            mkdir -p "${anonymizer_config.blurred_dir}"
        fi

        if [ ! -d "${anonymizer_config.csv_dir}" ]; then
            mkdir -p "${anonymizer_config.csv_dir}"
        fi

        if [ ! -d "${anonymizer_config.results_dir}" ]; then
            mkdir -p "${anonymizer_config.results_dir}"
        fi

        if [ ! -d "${anonymizer_config.models_dir}" ]; then
            mkdir -p "${anonymizer_config.models_dir}"
        fi

        # Ensure the correct owner, group, and permissions
        chown ${service-user}:${service-group} "${anonymizer_dir}"
        chmod 775 "${anonymizer_dir}"

        chown ${service-user}:${service-group} "${anonymizer_config.temp_dir}"
        chmod 775 "${anonymizer_config.temp_dir}"

        chown ${service-user}:${service-group} "${anonymizer_config.blurred_dir}"
        chmod 775 "${anonymizer_config.blurred_dir}"

        chown ${service-user}:${service-group} "${anonymizer_config.csv_dir}"
        chmod 775 "${anonymizer_config.csv_dir}"

        chown ${service-user}:${service-group} "${anonymizer_config.results_dir}"
        chmod 775 "${anonymizer_config.results_dir}"

        chown ${service-user}:${service-group} "${anonymizer_config.models_dir}"
        chmod 775 "${anonymizer_config.models_dir}"
    '';

    nvidiaCache = cachix.lib.mkCachixCache {
        inherit (pkgs) lib;
        name = "nvidia";
        publicKey = "nvidia.cachix.org-1:dSyZxI8geDCJrwgvBfPH3zHMC+PO6y/BT7O6zLBOv0w=";
        secretKey = null;  # not needed for pulling from the cache
      };

    system = "x86_64-linux";
    self = inputs.self;

    # Import nixpkgs with desired configuration
    pkgs = import nixpkgs {
      inherit system;
      config = {
        allowUnfree = true;
        cudaSupport = true;
      };
    };

    pypkgs-build-requirements = {
      gender-guesser = [ "setuptools" ];
      conllu = [ "setuptools" ];
      janome = [ "setuptools" ];
      pptree = [ "setuptools" ];
      wikipedia-api = [ "setuptools" ];
      django-flat-theme = [ "setuptools" ];
      django-flat-responsive = [ "setuptools" ];
      # transformers = [ "maturin" ];
    };

    poetry2nix = inputs.poetry2nix.lib.mkPoetry2Nix { inherit pkgs;};

    lib = pkgs.lib;

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
    );

    poetryApp = poetry2nix.mkPoetryApplication {
      python = pkgs.python311;
      projectDir = ./.;
      src = lib.cleanSource ./.;
      groups = ["dev"];
      overrides = p2n-overrides;
      
      preferWheels = true; # required for transformers via p2n

      propagatedBuildInputs =  with pkgs.python311Packages; [];

      nativeBuildInputs = with pkgs; [ 
        python311Packages.pip
        python311Packages.setuptools
        python311Packages.torch-bin
        python311Packages.torchvision-bin
        python311Packages.torchaudio-bin
      ];



      };



    
  in {

    nixConfig = {
        binary-caches = [
          nvidiaCache.binaryCachePublicUrl
        ];
        binary-cache-public-keys = [
          nvidiaCache.publicKey
        ];
        # enable cuda support
        cudaSupport = true;
      };

    

    packages.x86_64-linux.poetryApp = poetryApp;
    packages.x86_64-linux.default = poetryApp;

    apps.x86_64-linux.default = {
      type = "app";
      program = "${poetryApp}/bin/django-server";
    };


    devShells.x86_64-linux.default = pkgs.mkShell {
      inputsFrom = [ self.packages.x86_64-linux.poetryApp ];
      packages = [ 
        pkgs.poetry
      ];
      shellHook = ''
        export CUDA_PATH=${pkgs.cudaPackages_11.cudatoolkit}
        export PATH="${dirSetupScript}/bin:${pkgs.cudaPackages_11.cudatoolkit}/bin:$PATH"
        export DJANGO_DEBUG=True
        export DJANGO_SETTINGS_MODULE=${anonymizer_config.settings_module}
        export AGL_ANONYMIZER_TEMP_DIR="${anonymizer_config.temp_dir}"
        export AGL_ANONYMIZER_BLURRED_DIR="${anonymizer_config.blurred_dir}"
        export AGL_ANONYMIZER_CSV_DIR="${anonymizer_config.csv_dir}"
        export AGL_ANONYMIZER_RESULTS_DIR="${anonymizer_config.results_dir}"
        export AGL_ANONYMIZER_MODELS_DIR="${anonymizer_config.models_dir}"
        export AGL_ANONYMIZER_INPUT_DIR="${anonymizer_config.input_dir}"
        export AGL_ANONYMIZER_DEFAULT_MAIN_DIR="${anonymizer_config.anonymizer_dir}"
        export AGL_ANONYMIZER_DEFAULT_TEMP_DIR="${anonymizer_config.anonymizer_temp_dir}"
      '';
    };


nixosModules = {
  agl-anonymizer = { config, pkgs, lib, ... }: {
    options.services.agl-anonymizer = {
      enable = lib.mkOption {
        default = false;
        description = "Enable the AGL Anonymizer service";
      };

      user = lib.mkOption {
        default = "anonymizer";
        description = "User to run the AGL Anonymizer service as";
      };

      group = lib.mkOption {
        default = "service-user";
        description = "Group to run the AGL Anonymizer service as";
      };

      django-config = lib.mkOption {
        description = "Django configuration (debug, settings-module, etc.)";
        default = {
          debug = false;
          settings_module = "agl_anonymizer.settings";
          port = 9123;
        };
      };

      anonymizer-root = lib.mkOption {
        description = "Directory for the AGL Anonymizer service";
        default = "/etc/agl-anonymizer";
      };

      anonymizer-temp-root = lib.mkOption {
        description = "Directory for temporary files";
        default = "/etc/agl-anonymizer-temp";
      };

      anonymizer-temp_dir = lib.mkOption {
        description = "Directory for temporary files";
        default = "/etc/agl-anonymizer-temp/temp";
      };

      anonymizer-blurred_dir = lib.mkOption {
        description = "Directory for blurred images";
        default = "${anonymizer_dir}/blurred_results";
      };

      anonymizer-csv_dir = lib.mkOption {
        description = "Directory for CSV training data";
        default = "${anonymizer_dir}/csv_training_data";
      };

      anonymizer-models_dir = lib.mkOption {
        description = "Directory for models";
        default = "${anonymizer_dir}/models";
      };

      anonymizer-results_dir = lib.mkOption {
        description = "Directory for results";
        default = "${anonymizer_dir}/results";
      };
    };

    config = lib.mkIf config.services.agl-anonymizer.enable {

      systemd.services.setup-agl-anonymizer-directories = {
        description = "Ensure the custom directory tree is available and has correct ownership and permissions";
        serviceConfig = {
            ExecStart = "${dirSetupScript}/bin/setup-agl-anonymizer-directories";
            User = "root";  # Run as root to ensure directory creation and permissions are correct
            Group = "root";
            Type = "oneshot";  # Runs once at boot
        };
        wantedBy = [ "multi-user.target" ];  # Ensure this runs during boot
        before = [ "agl-anonymizer" ];  # Ensure it runs before the logger service
      };
      systemd.services.agl-anonymizer = {
        description = "AGL Anonymizer service";
        after = [ "network.target" ];
        wantedBy = [ "multi-user.target" ];
        serviceConfig = {
          Restart = "always";
          User = config.services.agl-anonymizer.user;
          ExecStart = "${poetryApp}/bin/django-server runserver ${config.services.agl-anonymizer.django-config.port}";
          WorkingDirectory = config.services.agl-anonymizer.config.anonymizer_dir;
          Environment = [
            "DJANGO_DEBUG=${toString config.services.agl-anonymizer.django-config.debug}"
            "DJANGO_SETTINGS_MODULE=${config.services.agl-anonymizer.django-config.settings_module}"
            "AGL_ANONYMIZER_TEMP_DIR=${config.services.agl-anonymizer.anonymizer-temp-root}"
            "AGL_ANONYMIZER_BLURRED_DIR=${config.services.agl-anonymizer.anonymizer-blurred_dir}"
            "AGL_ANONYMIZER_CSV_DIR=${config.services.agl-anonymizer.anonymizer-csv_dir}"
            "AGL_ANONYMIZER_RESULTS_DIR=${config.services.agl-anonymizer.anonymizer-results_dir}"
            "AGL_ANONYMIZER_MODELS_DIR=${config.services.agl-anonymizer.anonymizer-models_dir}"
            "AGL_ANONYMIZER_INPUT_DIR=${config.services.agl-anonymizer.anonymizer-input_dir}"
            "AGL_ANONYMIZER_DEFAULT_MAIN_DIR=${config.services.agl-anonymizer.anonymizer-root}"
            "AGL_ANONYMIZER_DEFAULT_TEMP_DIR=${config.services.agl-anonymizer.anonymizer-temp-root}"
          ];
        };
      };

    };
  };
};


  };
}