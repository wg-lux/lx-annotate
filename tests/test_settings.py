from pathlib import Path
import os
from endoreg_db.utils.paths import STORAGE_DIR
from endoreg_db.logger_conf import get_logging_config # Import the function

ASSET_DIR = Path(__file__).parent / "assets"
RUN_VIDEO_TESTS = os.environ.get("RUN_VIDEO_TESTS", "true").lower() == "true"

DEBUG=True
SECRET_KEY = "fake-key"
INSTALLED_APPS = [
    "tests",
    "endoreg_db.apps.EndoregDbConfig",
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
]
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

BASE_DIR = Path(__file__).parent.parent

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_db.sqlite3',
    },
}

TIME_ZONE = "Europe/Berlin"

MEDIA_ROOT = STORAGE_DIR
MEDIA_URL = '/media/' # Adjust if needed

# --- Define logger names needed for tests ---
TEST_LOGGER_NAMES = [

]

# --- Use the imported function to generate LOGGING ---
LOGGING = get_logging_config(TEST_LOGGER_NAMES, file_log_level="INFO") # Or set level via env var
