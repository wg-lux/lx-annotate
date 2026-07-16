from django.apps import AppConfig
from django.conf import settings
import os
from pathlib import Path
import sys
import threading


class LxAnnotateConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lx_annotate"

    _SKIP_RUNTIME_CHECK_COMMANDS = {
        "check",
        "collectstatic",
        "dbshell",
        "makemigrations",
        "migrate",
        "shell",
        "showmigrations",
        "test",
    }

    def _should_skip_runtime_checks(self, command: str) -> bool:
        if command in self._SKIP_RUNTIME_CHECK_COMMANDS:
            return True

        entrypoint = Path(sys.argv[0]).resolve()
        if entrypoint.name == "manage.py":
            return True
        if entrypoint.name == "__main__.py" and "django" in entrypoint.parts:
            return True

        if getattr(settings, "TESTING", False):
            return True

        settings_module = str(getattr(settings, "SETTINGS_MODULE", "") or "")
        if "settings_test" in settings_module:
            return True

        if "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST"):
            return True

        return False

    # This is running in development server only. On luxnix, filewatcher is started via systemd service.
    def ready(self):
        from . import checks
        from . import signals  # noqa: F401

        command = sys.argv[1] if len(sys.argv) > 1 else ""
        if not self._should_skip_runtime_checks(command):
            checks.assert_runtime_checks_pass()

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
                call_command("run_filewatcher", log_level="INFO")
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
