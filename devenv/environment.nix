# Environment configuration for devenv
{ lxVars, buildInputs, runtimePackages ? [], pkgs, lib, isDev ? false, appConfig }:
{
  LD_LIBRARY_PATH = "${
    with pkgs;
    lib.makeLibraryPath (
      buildInputs ++ runtimePackages ++ [ stdenv.cc.cc.lib gcc-unwrapped.lib glibc ]
    )
  }:/run/opengl-driver/lib:/run/opengl-driver-32/lib";
}
// lxVars
