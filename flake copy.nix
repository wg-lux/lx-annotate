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
  
    # pkgs = import nixpkgs {
    #   inherit system;
    #   config.allowUnfree = true;
    # };

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

    # Also override "pkgs" definition from above
    pkgs = nixpkgs.legacyPackages.${system}.extend poetry2nix.overlays.default;
    # pythonApp = pkgs.poetry2nix.mkPoetryApplication { projectDir = self; };
    lib = pkgs.lib;

    # This python environment is automatically deployed in the background; kind of; or something
    # https://github.com/nix-community/poetry2nix?tab=readme-ov-file#mkpoetryenv
    # https://github.com/nix-community/poetry2nix/blob/master/tests/env/default.nix
    pythonEnv = pkgs.poetry2nix.mkPoetryEnv { 
      projectDir = ./.;
      # pyproject = ./pyproject.toml; # default is projectDir/pyproject.toml 
      # poetryLock = ./poetry.lock; # default is projectDir/poetry.lock
      
      # overrides = # default = defaultPoetryOverrides
      # overrides = pkgs.poetry2nix.overrides.withDefaults (final: prev: {
      #   # Notice that using .overridePythonAttrs or .overrideAttrs won't work!
      #   some-dependency = prev.some-dependency.override {
      #     preferWheel = true;
      # };

      # meta = {
      #   description = "Flake for the Django based `agl-monitor` service";
      #   longDescription = ''
      #     This is a flake for the Django based `agl-monitor` service.
      #   '';
      #   license = lib.licenses.mit; # default is empty
      # };
      # python = pkgs.python311; # default is pkgs.python3
      # preferWheels = true; # default is false
      # groups = []; # default is []; Which poetry1.2.0 dependency groups to install
      # editablePackageSources = {
      #   agl-monitor-package = { 
      #     path = ./src; 
      #   };
      # }
    };
    
    
  in
{
  # Create a package output
  # run `nix-build .#hello` to build it.
  # run `nix build .#hello` to build it.
  packages.x86_64-linux.hello = pkgs.hello;

  # assign default package
  packages.x86_64-linux.default = pkgs.hello;

  # Create Default DevShell
  devShells.x86_64-linux.base = pkgs.mkShell {
    buildInputs = with pkgs; [
      python311Full

      poetry
    ];
  };

  # poetry shell
  # devShells.x86_64-linux.poetry = pythonEnv.env.overrideAttrs (oldAttrs: {
  #   # buildInputs = [ pkgs.poetry ];
  # });
  devShells.x86_64-linux.default = pythonEnv;


  # Create python App
  # apps.x86_64-linux.default = {
  #       type = "app";

  #       # replace <script> with the name in the [tool.poetry.scripts] section of your pyproject.toml
  #       program = "${pythonApp}/bin/agl-monitor-flake";
  #     };
  
  };
}
