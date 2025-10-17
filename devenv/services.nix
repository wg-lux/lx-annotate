# Services configuration for devenv
{ pkgs, lib, appConfig, isDev ? false }:
{
  # In prod mode: expect external services, no local services
  postgres = if isDev then {
    enable = false;
    # listen_addresses = "127.0.0.1";
    # port = ${appConfig.services.postgres.port};
    # initialDatabases = [
    #   {
    #     name = "${appConfig.database.prod.name}";
    #     user = "${appConfig.database.prod.user}";
    #     pass = "localdev123";
    #   }
    # ];
  } else {
    enable = false;
  };

  redis = if isDev then {
    # enable = false; # Enable when needed in dev
    # bind = "127.0.0.1";
    # port = ${appConfig.services.redis.port};
  } else {
    enable = false; # External service in prod
  };
}
