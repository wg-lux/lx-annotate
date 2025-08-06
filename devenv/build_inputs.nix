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
  ];

in buildInputs