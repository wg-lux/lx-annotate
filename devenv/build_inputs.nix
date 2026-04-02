{pkgs, ...}:
let
  buildInputs = with pkgs; [
    python312
    stdenv.cc.cc
    tesseract
    glib
    openssh
    cmake
    gcc
    pkg-config
    protobuf
    libglvnd
    zlib
    xorg.libxcb
    xorg.libX11
    xorg.libXext
    xorg.libICE
    xorg.libSM
    glib
    libGL
  ];

in buildInputs