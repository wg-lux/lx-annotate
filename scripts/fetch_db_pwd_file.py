import shutil
import os
import sys

db_pwd_target = os.environ.get("DB_PWD_FILE")
db_pwd_source = os.environ.get("LX_MAINTENANCE_PASSWORD_FILE")

if not db_pwd_target or not db_pwd_source:
    print("ERROR: Missing required environment variables for database password setup", file=sys.stderr)
    print("\nRequired variables:", file=sys.stderr)
    print(f"  DB_PWD_FILE: {'✓ Set' if db_pwd_target else '✗ Missing'} {db_pwd_target or ''}", file=sys.stderr)
    print(f"  LX_MAINTENANCE_PASSWORD_FILE: {'✓ Set' if db_pwd_source else '✗ Missing'} {db_pwd_source or ''}", file=sys.stderr)
    print("\nThis script requires access to the LX maintenance password from the luxnix vault system.", file=sys.stderr)
    print("The vault file should be managed by the luxnix environment and accessible at:", file=sys.stderr)
    print("  ~/secrets/vault/SCRT_local_password_maintenance_password", file=sys.stderr)
    print("\nFor development without luxnix vault access:", file=sys.stderr)
    print("  1. Ensure you're running in a properly configured luxnix environment", file=sys.stderr)
    print("  2. Or manually create the DB_PWD_FILE with a development password", file=sys.stderr)
    print("  3. Contact system administrator for vault access permissions", file=sys.stderr)
    sys.exit(1)

# check whether source exists and we are allowed to read it
if not os.path.exists(db_pwd_source):
    print(f"ERROR: LX maintenance password file not found: {db_pwd_source}", file=sys.stderr)
    print("\nThis file should be provided by the luxnix vault system.", file=sys.stderr)
    print("Possible solutions:", file=sys.stderr)
    print("  1. Ensure you're running in a properly configured luxnix environment", file=sys.stderr)
    print("  2. Verify vault access permissions with system administrator", file=sys.stderr)
    print("  3. Check if luxnix vault service is running", file=sys.stderr)
    sys.exit(1)

if not os.access(db_pwd_source, os.R_OK):
    print(f"ERROR: Permission denied reading LX maintenance password file: {db_pwd_source}", file=sys.stderr)
    print("\nThe file exists but is not readable by the current user.", file=sys.stderr)
    print("This suggests a permissions issue with the luxnix vault system.", file=sys.stderr)
    print("Contact your system administrator to resolve vault access permissions.", file=sys.stderr)
    sys.exit(1)

try:
    shutil.copyfile(db_pwd_source, db_pwd_target) #TODO Make sure file permissions are set correctly
    os.chmod(db_pwd_target, 0o600)  # Set permissions to read/write for owner only
    print(f"Successfully copied database password from vault to {db_pwd_target}")
except Exception as e:
    print(f"ERROR: Failed to copy database password file: {e}", file=sys.stderr)
    print(f"Source: {db_pwd_source}", file=sys.stderr)
    print(f"Target: {db_pwd_target}", file=sys.stderr)
    sys.exit(1)
