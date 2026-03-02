{pkgs,uvPackage, ...}:
let

  runtimePackages = with pkgs; [
    stdenv.cc.cc
    ffmpeg-headless.bin
    tesseract
    uvPackage
    libglvnd 
    glib
    xorg.libxcb
    zlib
    ollama.out
    cryptomator
  ];


in runtimePackages
