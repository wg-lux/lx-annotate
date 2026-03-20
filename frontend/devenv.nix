{
  pkgs,
  inputs,
  ...
}:
{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };

  packages = [
    pkgs.git
  ];

  env = {
    LX_ENABLE_BASE_API = "1";
    LX_DATA_MODELS_ROOT = "${inputs.lx-data-models}";
    LOOKUP_DTYPES_DATA_ROOT = "${inputs.lx-data-models}/lx_dtypes/data";
  };

  scripts.install.exec = "npm ci";
  scripts.build.exec = "npm run build";
  scripts.test.exec = "npm run test:unit -- --run";

  enterShell = ''
    echo "Frontend devenv ready."
    echo "Run 'install' once if node_modules is missing, then 'build'."
    echo "LX_DATA_MODELS_ROOT=$LX_DATA_MODELS_ROOT"
  '';
}
