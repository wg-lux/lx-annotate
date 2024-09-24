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
    python_version = "311";
  
    raw-pkgs = import nixpkgs {
      inherit system;
      config.allowUnfree = true;

    
    };
    # note that we use "inputs.nixpkgs-unstable" to refer to the flake input
    # We need to do that because in "outputs = { nixpkgs, ... } @ inputs:",
    # nixpkgs is not passed directly but the "..." overflow attribute is passed to "inputs".
    pkgs-unstable = inputs.nixpkgs-unstable.legacyPackages.x86_64-linux;

    pkgs = raw-pkgs.extend poetry2nix.overlays.default;
    lib = pkgs.lib;

    poetryApplication = pkgs.poetry2nix.mkPoetryApplication {
      projectDir = ./.;
      src = lib.cleanSource ./.;
      python = pkgs."python${python_version}Full";
    };       
    
  in
  {

    # Create Default DevShell
    # https://ryantm.github.io/nixpkgs/builders/special/mkshell/
    devShells.x86_64-linux.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        python311Full
        poetry
      ];

      packages = [
        pkgs.python311Full 
        pkgs.python311Packages.django
      ];

      inputsFrom = [];
    };

    packages.x86_64-linux.default = poetryApplication;

    # Create python App
    apps.x86_64-linux.default = {
        type = "app";
        # replace <script> with the name in the [tool.poetry.scripts] section of your pyproject.toml
        program = "${poetryApplication}/bin/django-server";
      };
  
  };
}
