# Pypi Publishing

The make package workflow vreates a binary including the nix derivation of the frontend. This allows the python wheel to include a pinned version of the frontend.

Also, docs are included here through sphinx.

## The frontend dependency lock changed, but its Nix dependency hash was not updated.
 
A commit might have added a package to package.json and package-lock.json. However, default.nix might still contain the hash for the previous dependency set:
npmDepsHash = "sha256-gFyVehSwVatoPJnel6OSbV2mYRbG3Fbk5/aooeEzzhw=";

Nix downloaded the dependencies described by the new lockfile, calculated their actual hash, and correctly rejected them because reproducibility checks found:

expected: sha256-gFyVehSwVatoPJnel6OSbV2mYRbG3Fbk5/aooeEzzhw=
actual:   sha256-w4+drE6pSUWLrKiGetBqttaomC9mPEMDwm8ElcpLoVY=

The repair is to update npmDepsHash to the reported actual hash and rerun make package:

npmDepsHash = "sha256-w4+drE6pSUWLrKiGetBqttaomC9mPEMDwm8ElcpLoVY=";
