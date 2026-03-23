{
  description = "Pure Nix packaging for lx-annotate frontend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        frontend = pkgs.callPackage ./default.nix { };
      in
      {
        packages = {
          default = frontend;
          frontend = frontend;
        };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
          ];
        };
      }
    );
}
