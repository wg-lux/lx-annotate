{pkgs,uvPackage, ...}:
let
  enableOllama = builtins.getEnv "DEVENV_ENABLE_OLLAMA" == "1";

  runtimePackages = with pkgs; [
    stdenv.cc.cc
    ffmpeg-headless.bin
    tesseract
    uvPackage
    libglvnd 
    glib
    libxcb
    zlib
    cryptomator
  ] ++ (if enableOllama then [ ollama.out ] else [ ]);


in runtimePackages
