{ pkgs, lib, config, ... }@inputs:
{
  "version:bump" = {
    description = "Bump every repository release version; set VERSION_BUMP to major, minor, patch, or X.Y.Z";
    exec = ''
      set -euo pipefail
      : "''${VERSION_BUMP:?Set VERSION_BUMP to major, minor, patch, or an exact X.Y.Z version.}"
      ${pkgs.python312}/bin/python scripts/bump_release_version.py "$VERSION_BUMP"
    '';
  };
}
