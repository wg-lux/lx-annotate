#!/usr/bin/env python3
"""
Cron job script for automated storage monitoring and cleanup.
Run this script hourly to prevent storage issues.

Add to crontab:
0 * * * * /home/admin/test/lx-annotate/scripts/storage_monitor.py >> /home/admin/test/lx-annotate/logs/storage_monitor.log 2>&1
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Add project root to Python path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings.dev')

# Configure Django
import django
django.setup()

from django.core.management import call_command
from django.conf import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(PROJECT_ROOT / 'logs' / 'storage_monitor.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Main storage monitoring and automatic cleanup."""
    try:
        logger.info("🔍 Starting automated storage monitoring...")
        
        # Run storage management with automatic cleanup
        call_command(
            'storage_management',
            '--cleanup-frames',
            '--cleanup-uploads', 
            '--emergency-threshold=90.0',  # Trigger at 90% instead of 95%
            verbosity=1
        )
        
        logger.info("✅ Storage monitoring completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Storage monitoring failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()