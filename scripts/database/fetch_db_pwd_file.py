import shutil
import os

db_pwd_target = os.environ.get("DB_PWD_FILE")
db_pwd_source = os.environ.get("LX_MAINTENANCE_PASSWORD_FILE")

if not db_pwd_target or not db_pwd_source:
    raise ValueError("Both DB_PWD_FILE and LX_MAINTENANCE_PASSWORD_FILE environment variables must be set")

# check whether source exists and we are allowed to read it
if not os.path.exists(db_pwd_source):
    raise FileNotFoundError(f"Source file {db_pwd_source} does not exist")
if not os.access(db_pwd_source, os.R_OK):
    raise PermissionError(f"Source file {db_pwd_source} is not readable")

shutil.copyfile(db_pwd_source, db_pwd_target) #TODO Make sure file permissions are set correctly
os.chmod(db_pwd_target, 0o600)  # Set permissions to read/write for owner only
