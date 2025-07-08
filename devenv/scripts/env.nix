{ config, pkgs, lib, buildInputs,
... }@inputs: 
let

  envScripts = {
    env-setup.exec = ''
      export LD_LIBRARY_PATH="${
        with pkgs;
        lib.makeLibraryPath buildInputs
      }:/run/opengl-driver/lib:/run/opengl-driver-32/lib"
    '';
  };

in envScripts