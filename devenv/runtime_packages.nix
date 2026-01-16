{pkgs,uvPackage, ...}:
let

  runtimePackages = with pkgs; [
    stdenv.cc.cc
    ffmpeg-headless.bin
    tesseract
    uvPackage
    libglvnd 
    glib
    zlib
    ollama.out
    cryptomator
  ];


in runtimePackages