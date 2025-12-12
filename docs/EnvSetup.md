# Documentation of devenv setup and environment variables

Setting up the Environment is crucial to ensure a smooth operation of the reopsitories import and export functionality as well as for the security of the django app.

To help with setting up the repository, a .env-example file is provided and shipped with the app. Please:

- [x] Copy and validate the values in .env-example for your setup
- [x] Write or generate a personal DJANGO_SECRET_KEY and DJANGO_SALT (should be handled automatically, however please ensure this for your data safety!)
- [x] Set your preferred defaults. Production uses a postgres SQL database and requires keycloak authorization.

The additional values in env are mostly coming from devenv. Here, for example, the global Storage Dir is set that will used by endoreg db.