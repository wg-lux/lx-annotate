{
  description = "Flake for the Django based `agl-monitor` service";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    
    poetry2nix.url = "github:nix-community/poetry2nix";
    poetry2nix.inputs.nixpkgs.follows = "nixpkgs";

  };

  # @inputs is a shorthand for { nixpkgs = inputs.nixpkgs; ... }
  # This is useful to avoid repeating the same prefix over and over.
  # "..." is a special attribute that refers to the rest of the attributes.
  outputs = { nixpkgs, poetry2nix, ... } @ inputs: 
  let 
    system = "x86_64-linux";
    self = inputs.self;
    version = "0.1.${pkgs.lib.substring 0 8 inputs.self.lastModifiedDate}.${inputs.self.shortRev or "dirty"}";
  
    raw-pkgs = import nixpkgs {
      inherit system;
      config.allowUnfree = true;
    };

    # note that we use "inputs.nixpkgs-unstable" to refer to the flake input
    # We need to do that because in "outputs = { nixpkgs, ... } @ inputs:",
    # nixpkgs is not passed directly but the "..." overflow attribute is passed to "inputs".
    pkgs-unstable = inputs.nixpkgs-unstable.legacyPackages.x86_64-linux;

    # create a custom "mkPoetryApplication" API function that under the hood uses
    # the packages and versions (python3, poetry etc.) from our pinned nixpkgs above:
    # inherit (
    #   poetry2nix.lib.mkPoetry2Nix { 
    #     inherit pkgs; 
    #   }
    # ) mkPoetryApplication;
    # pythonApp = mkPoetryApplication { projectDir = ./.; };


    # Additionally, this project flake provides an overlay to merge 
    # poetry2nix into your pkgs and access it as pkgs.poetry2nix. 
    # Just replace the three lines pkgs = ..., inherit ... and myPythonApp = ... 
    # above with

    # project_dir = "./agl_monitor_flake";

    # Also override "pkgs" definition from above
    pkgs = raw-pkgs.extend poetry2nix.overlays.default;
    lib = pkgs.lib;

    pythonApp = pkgs.poetry2nix.mkPoetryApplication {
      projectDir = ./.; 
      src = lib.cleanSource ./.;
      # preferWheels = true; # default is false
      # src = lib.cleanSource ./.;
    };
    
    # This python environment is automatically deployed in the background; kind of; or something
    # https://github.com/nix-community/poetry2nix?tab=readme-ov-file#mkpoetryenv
    # https://github.com/nix-community/poetry2nix/blob/master/tests/env/default.nix
    # pythonEnv = pkgs.poetry2nix.mkPoetryEnv { 
      # projectDir = ./.;

      # extraPackages = (ps: [ 
      #   pkgs.python311Full
      # ]);
    # };
    
    
  in
  {

    # Create Default DevShell
    # https://ryantm.github.io/nixpkgs/builders/special/mkshell/
    devShells.x86_64-linux.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        python311Full
        pkgs.python311Packages.opencv4 
        pkgs.python311Packages.numpy
        pkgs.python311Packages.pandas
        pkgs.python311Packages.django

        poetry
      ];

      packages = [
        pkgs.python311Full 
        pkgs.python311Packages.django
      ];

      inputsFrom = [ 
        pkgs.python311Packages.opencv4 
        pkgs.python311Packages.numpy
        pkgs.python311Packages.pandas
        pkgs.python311Packages.django
      ];
    };

    # poetry shell
    # devShells.x86_64-linux.poetry = pythonEnv.env.overrideAttrs (oldAttrs: {
    #   # buildInputs = [ pkgs.poetry ];
    # });
    # devShells.x86_64-linux.poetry = pythonEnv;

    packages.x86_64-linux.default = pythonApp;

    # Create python App
    apps.x86_64-linux.default = {
        type = "app";
        # replace <script> with the name in the [tool.poetry.scripts] section of your pyproject.toml
        program = "${pythonApp}/bin/django-server";
      };
  
  };
}
