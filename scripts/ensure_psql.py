from endoreg_db.utils import DbConfig
from icecream import ic
import os
from pathlib import Path

db_config_file = os.environ.get("DB_CONFIG_FILE")
if not db_config_file:
    raise ValueError("DB_CONFIG_FILE environment variable is not set")

assert isinstance(db_config_file, str), "DB_CONFIG_FILE must be a string path"


db_config_file = Path(db_config_file).resolve()

assert db_config_file.exists(), f"Database config file {db_config_file} does not exist"

db_cfg = DbConfig.from_file(db_config_file)

db_user = db_cfg.user
db_password = db_cfg.password
db_host = db_cfg.host
db_port = db_cfg.port
db_name = db_cfg.name


def run_psql_command(sql):
    from subprocess import run, PIPE

    result = run(
        ["sudo", "-u", "postgres", "psql", "-c", sql], capture_output=True, text=True
    )
    if "ERROR" in result.stderr:
        ic("SQL Error:", result.stderr.strip())
    return result.stdout.strip()


def set_local_postgres_password(user, new_password):
    sql = f"ALTER USER \"{user}\" WITH PASSWORD '{new_password}'"
    run_psql_command(sql)


def create_local_postgres_role_if_not_exists(user):
    check_sql = f"SELECT 1 FROM pg_roles WHERE rolname = '{user}'"
    result = run_psql_command(check_sql)

    if not result.strip():
        create_sql = f'CREATE USER "{user}" WITH LOGIN'
        run_psql_command(create_sql)


def check_database_exists(dbname):
    sql = f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'"
    result = run_psql_command(sql)
    return bool(result.strip())

def create_local_database_if_not_exists(dbname, owner):
    if not check_database_exists(dbname):
        sql = f'CREATE DATABASE "{dbname}" WITH OWNER "{owner}"'
        run_psql_command(sql)
    else:
        # Ensure the owner is correct
        sql = f'ALTER DATABASE "{dbname}" OWNER TO "{owner}"'
        run_psql_command(sql)
    # Ensure privileges
    grant_sql = f'GRANT ALL PRIVILEGES ON DATABASE "{dbname}" TO "{owner}"'
    run_psql_command(grant_sql)


def test_connection():
    import psycopg

    try:
        with psycopg.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
        ) as conn:
            ic(f"Connection successful: {db_user}@{db_host}:{db_port}/{db_name}")
    except Exception as e:
        ic("Connection failed:", str(e))


def main():
    create_local_postgres_role_if_not_exists(db_user)
    set_local_postgres_password(db_user, db_password)
    create_local_database_if_not_exists(db_user, db_user)
    test_connection()


if __name__ == "__main__":
    main()
