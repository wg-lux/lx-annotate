from pathlib import Path
from endoreg_db.utils import DbConfig
import os
import sys
from typing import Optional


def main(conf_dir: Optional[Path] = None, template_dir: Optional[Path] = None) -> None:
    """
    Generate the database configuration file from a template if it does not already exist.
    
    If the configuration directory does not exist, it is created. If the database configuration file is missing, it is generated from the template, validated, and written to the target location with an option to prompt for override.
    """
    try:
        # fetch environment variables
        template_dir_env = os.environ.get("CONF_TEMPLATE_DIR", "./conf_template")
        if not template_dir_env:
            raise ValueError("Missing CONF_TEMPLATE_DIR environment variable")
        
        template_dir = template_dir or Path(template_dir_env).resolve()
        template_dir.mkdir(parents=True, exist_ok=True)

        conf_dir_env = os.environ.get("CONF_DIR", "./conf")
        if not conf_dir_env:
            raise ValueError("Missing CONF_DIR environment variable")
        
        conf_dir = conf_dir or Path(conf_dir_env).resolve()
        conf_dir.mkdir(parents=True, exist_ok=True)

        # Define paths consistently using local variables
        db_template = template_dir / "db.yaml"
        db_target = conf_dir / "db.yaml"

        # Validate template exists
        if not db_template.exists():
            raise FileNotFoundError(f"Missing database template file: {db_template}")

        # Ensure configuration directory exists
        if not conf_dir.exists():
            print(f"Creating configuration directory: {conf_dir}")
            conf_dir.mkdir(parents=True, exist_ok=True)

        print(f"Loading database configuration from template: {db_template}")
        
        # Load and validate database configuration using the consistent db_template variable
        try:
            db_cfg = DbConfig.from_file(db_template)
        except Exception as e:
            raise ValueError(f"Failed to load database configuration from {db_template}: {e}")

        try:
            db_cfg.custom_validate()
        except Exception as e:
            raise ValueError(f"Database configuration validation failed: {e}")

        # Write configuration to target location
        try:
            print(f"Writing database configuration to: {db_target}")
            db_cfg.to_file(db_target.as_posix(), ask_override=True)
            print("Database configuration successfully created!")
        except Exception as e:
            raise IOError(f"Failed to write database configuration to {db_target}: {e}")

    except ValueError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"File not found: {e}", file=sys.stderr)
        sys.exit(1)
    except IOError as e:
        print(f"I/O error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error occurred while generating configuration: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
