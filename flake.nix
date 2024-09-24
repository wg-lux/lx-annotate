{
  description = "Flake for the Django based `agl-anonymizer` service";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    
    poetry2nix.url = "github:nix-community/poetry2nix";
    poetry2nix.inputs.nixpkgs.follows = "nixpkgs";

  };

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

    pkgs-unstable = inputs.nixpkgs-unstable.legacyPackages.x86_64-linux;

    pkgs = raw-pkgs.extend poetry2nix.overlays.default;
    lib = pkgs.lib;

    # Include setuptools in buildInputs
    poetryApplication = pkgs.poetry2nix.mkPoetryApplication {
      projectDir = ./.;
      src = lib.cleanSource ./.;
      python = pkgs."python${python_version}Full";
      
      # Add setuptools to buildInputs
      buildInputs = with pkgs.python311Packages; [
        setuptools
      ];
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
        pkgs.python311Packages.numpy
        pkgs.python311Packages.gensim
        pkgs.python311Packages.scipy
        pkgs.python311Packages.dulwich
        pkgs.python311Packages.pandas
        pkgs.python311Packages.pytesseract
        pkgs.python311Packages.numpy
        pkgs.python311Packages.imutils
        pkgs.python311Packages.pip
        pkgs.python311Packages.djangorestframework-guardian2
        pkgs.python311Packages.django-cors-headers
        pkgs.python311Packages.pillow
        pkgs.python311Packages.requests
        pkgs.python311Packages.gunicorn
        pkgs.python311Packages.psycopg2

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
