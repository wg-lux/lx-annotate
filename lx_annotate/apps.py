from django.apps import AppConfig
import os
import sys
import threading


class LxAnnotateConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lx_annotate"

    def ready(self):
        # Only for runserver
        if "runserver" not in sys.argv:
            return

        # Only in autoreload child, not in the parent
        if os.environ.get("RUN_MAIN") != "true":
            return

        self.start_file_watcher()

    def start_file_watcher(self) -> bool:
        def run_watcher():
            try:
                from django.core.management import call_command

                print("📁 Starting file watcher service...")
                call_command("start_filewatcher", log_level="INFO")
            except Exception as e:
                print(f"⚠️ Failed to start file watcher: {e}")
                return False

        watcher_thread = threading.Thread(target=run_watcher, daemon=True)
        watcher_thread.start()
        print("✅ File watcher service started in background")
        return True


# class lxAnonymizerConfig(AppConfig):
#    default_auto_field = 'django.db.models.BigAutoField'
#    name = 'lx-anonymizer'
