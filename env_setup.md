# Documentation of devenv setup and environment variables

Devenv is used to automatically set up environment variables and dependencies needed for the quick setup in luxnix laptops as well as on other nix enabled systems.

For creation of the .env file, the python script env_setup.py is called from devenv.

## Database Password Management

The environment setup requires access to the LX maintenance password from the luxnix vault system. See [docs/vault-setup.md](docs/vault-setup.md) for detailed information about:

- Vault file location and permissions
- Troubleshooting vault access issues
- Development environment alternatives
- Security considerations

## Environment Setup Tasks

The devenv system provides these tasks for environment setup:

1. **`env:fetch-db-pwd-file`** - Fetches database password from luxnix vault
2. **`env:init-conf`** - Initializes database configuration files
3. **`env:build`** - Creates the .env file with all necessary variables
4. **`env:full-setup`** - Runs all setup tasks in sequence

### Running Setup Tasks

```bash
# Full automated setup (requires vault access)
devenv tasks run env:full-setup

# Manual step-by-step setup
devenv tasks run env:fetch-db-pwd-file
devenv tasks run env:init-conf  
devenv tasks run env:build
```

## Required Environment Variables

The following environment variables are set by devenv and used by the setup process:

- `DB_PWD_FILE` - Path to local database password file
- `LX_MAINTENANCE_PASSWORD_FILE` - Path to vault password file
- `CONF_DIR` - Configuration directory path
- `CONF_TEMPLATE_DIR` - Template directory path
- Other Django and application-specific variables

See `devenv/vars.nix` for the complete list of environment variables.

