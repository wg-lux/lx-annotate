from django.apps import AppConfig
import os
import sys
import subprocess
import threading
import atexit
from pathlib import Path


class LxAnnotateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lx_annotate'
    
    def ready(self):
        """
        Automatically start file watcher when Django starts up.
        Only runs during 'runserver' command to avoid starting during migrations, etc.
        """
        # Only start file watcher for runserver command
        if 'runserver' in sys.argv and not os.environ.get('RUN_MAIN'):
            # This prevents starting twice due to Django's autoreloader
            return
            
        if 'runserver' in sys.argv:
            self.start_file_watcher()
    
    def start_file_watcher(self):
        """Start the file watcher service in a separate thread."""
        def run_watcher():
            try:
                from django.core.management import call_command
                print("📁 Starting file watcher service...")
                call_command('start_filewatcher', log_level='INFO')
            except Exception as e:
                print(f"⚠️ Failed to start file watcher: {e}")
        
        # Start in daemon thread so it doesn't prevent Django shutdown
        watcher_thread = threading.Thread(target=run_watcher, daemon=True)
        watcher_thread.start()
        print("✅ File watcher service started in background")


#class lxAnonymizerConfig(AppConfig):
#    default_auto_field = 'django.db.models.BigAutoField'
#    name = 'lx-anonymizer'
