{
  pkgs,
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
    LX_DTYPES_HOST_MODELS_MODULE = "endoreg_db.integrations.lx_dtypes_host_models";
  };

  scripts.install.exec = "npm ci";
  scripts.build.exec = "npm run build";
  scripts.test.exec = "npm run test:unit -- --run";

  enterShell = ''
    echo "Frontend devenv ready."
    echo "Run 'install' once if node_modules is missing, then 'build'."
  '';
}
