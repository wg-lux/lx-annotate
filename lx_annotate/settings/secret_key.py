from pathlib import Path
from django.core.management.utils import get_random_secret_key
import os

# Assuming you can import APP_DATA_DIR from your settings_base or define it here
# If defined here, ensure it matches your systemd state directory:
HOME_DIR = Path(os.getenv("HOME_DIR", str(Path.home())))


def get_or_create_secret_key() -> str:
    """
    Returns the existing secret key from disk or generates/saves a new one.
    This is safe to commit to Git because the KEY itself is stored outside the repo.
    """
    if os.getenv("DJANGO_SECRET_KEY_FILE"):
        return ""
    secret_file = HOME_DIR / "secret.key"

    try:
        # 1. Try to read existing key
        if secret_file.exists():
            key = secret_file.read_text().strip()
            if len(key) >= 32:  # Basic validation
                return key

        # 2. If missing or invalid, generate new key
        HOME_DIR.mkdir(parents=True, exist_ok=True)
        new_key = get_random_secret_key()

        # 3. Write strictly (readable only by owner)
        # We create file, set permissions, then write
        secret_file.touch(mode=0o600)
        secret_file.write_text(new_key)

        return new_key

    except (PermissionError, OSError) as e:
        # Fallback for read-only environments (prevents crash, but sessions won't persist restarts)
        print(f"WARNING: Could not save secret key to {secret_file}: {e}")
        return get_random_secret_key()
