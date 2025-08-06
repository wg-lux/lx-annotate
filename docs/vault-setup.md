# LX Vault Setup and Database Password Management

## Overview

The lx-annotate application requires access to database credentials managed by the luxnix vault system. This document explains the vault dependency and how to resolve permission issues.

## Vault File Location

The application expects the LX maintenance password to be available at:
```
~/secrets/vault/SCRT_local_password_maintenance_password
```

This file is managed by the luxnix vault system and contains the database password required for PostgreSQL setup.

## Environment Setup Process

The environment setup follows this sequence:

1. **`env:fetch-db-pwd-file`** - Copies password from vault to local configuration
2. **`env:init-conf`** - Creates database configuration files
3. **`env:build`** - Generates the .env file for Django

## Permission Requirements

### For Luxnix Environments

In a properly configured luxnix environment, the vault file should be:
- Automatically mounted by the luxnix system
- Readable by the application user
- Managed by the luxnix vault service

### Required Environment Variables

```bash
DB_PWD_FILE=/path/to/conf/db_pwd
LX_MAINTENANCE_PASSWORD_FILE=~/secrets/vault/SCRT_local_password_maintenance_password
```

## Troubleshooting

### Error: "LX maintenance password file not found"

**Cause**: The vault file doesn't exist at the expected location.

**Solutions**:
1. Verify you're running in a luxnix environment
2. Check if the luxnix vault service is running
3. Contact system administrator for vault setup

### Error: "Permission denied reading LX maintenance password file"

**Cause**: The file exists but the current user doesn't have read permissions.

**Solutions**:
1. Check file permissions: `ls -la ~/secrets/vault/SCRT_local_password_maintenance_password`
2. Verify user belongs to required groups for vault access
3. Contact system administrator to fix vault permissions

### Development Without Vault Access

For development environments where vault access is not available:

1. **Manual Password File Creation**:
   ```bash
   mkdir -p conf
   echo "your-dev-password" > conf/db_pwd
   chmod 600 conf/db_pwd
   ```

2. **Skip Vault Step**: 
   Run individual setup tasks:
   ```bash
   # Skip fetch-db-pwd-file, run others
   devenv tasks run env:init-conf env:build
   ```

## Security Notes

- The vault file contains sensitive database credentials
- File permissions are set to 600 (owner read/write only) when copied
- Never commit database passwords to version control
- In production, ensure proper vault access controls

## Integration with init:conf

The `init:conf` task mentioned in the issue refers to the `env:init-conf` devenv task that:
1. Reads the database template configuration
2. Creates the database configuration file
3. Validates the configuration

This task depends on the vault password being available through the `env:fetch-db-pwd-file` task.

## Comparison with endo-api

Unlike endo-api which may have built-in vault integration, lx-annotate relies on:
- External luxnix vault system for password management
- File-based password access (not direct vault API calls)
- Environment variable configuration for vault file paths

This approach provides better separation of concerns and allows the application to work with different vault implementations.