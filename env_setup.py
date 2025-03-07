from django.core.management.utils import get_random_secret_key
from lx_logging import get_logger
import dotenv
import subprocess
import os

logger = get_logger(__name__)


SECRET_KEY=get_random_secret_key()

try:  
    f = open(".env", "x")
    f.write(f"DJANGO_SECRET_KEY={SECRET_KEY}") 
except:
    logger.debug("Django secret key already exists")

os.environ["DJANGO_SECRET_KEY"] = SECRET_KEY