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
    libxcb
    libx11
    libxext
    libice
    libsm
    glib
    libGL
  ];

in buildInputs