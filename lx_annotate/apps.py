from __future__ import annotations

import logging
import os
import sys
import threading
from pathlib import Path

from django.apps import AppConfig
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class LxAnnotateConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lx_annotate"

    _SKIP_RUNTIME_CHECK_COMMANDS = {
        "check",
        "check_migration_compatibility",
        "collectstatic",
        "dbshell",
        "emergency_storage_relief",
        "makemigrations",
        "migrate",
        "provision_hub_nodes",
        "recover_runtime_data",
        "runtime_acceptance",
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

    def _should_initialize_terminology(self, command: str) -> bool:
        if not getattr(settings, "TERMINOLOGY_AUTO_PROVISION", True):
            return False

        if getattr(settings, "TESTING", False):
            return False

        if "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST"):
            return False

        settings_module = str(getattr(settings, "SETTINGS_MODULE", "") or "")
        if "settings_test" in settings_module:
            return False

        return command not in self._SKIP_RUNTIME_CHECK_COMMANDS

    _terminology_initialized: bool = False

    def _initialize_terminology(self) -> None:
        """Provision and validate terminology before completing startup."""
        if self._terminology_initialized:
            return

        from lx_dtypes.terminology.terminology_loader import (
            get_terminology_service,
        )
        from lx_dtypes.terminology.terminology_service import TerminologyError

        service = get_terminology_service()
        logger.info(
            "Initializing terminology registry: %s",
            service.registry_path,
        )

        try:
            service.provision()

            identity = service.active_identity()
            if identity is None:
                raise ImproperlyConfigured(
                    "Terminology registry has no active bundle: "
                    f"{service.registry_path}"
                )

            # Verify that the selected identity is actually loadable.
            service.load(*identity)

        except TerminologyError as exc:
            raise ImproperlyConfigured(
                f"Terminology startup failed for {service.registry_path}: {exc}"
            ) from exc

        # Only record success after both provisioning and loading succeed.
        self._terminology_initialized = True

        logger.info(
            "Terminology ready: %s@%s; registry=%s",
            identity[0],
            identity[1],
            service.registry_path,
        )

    # This is running in development server only. On luxnix, filewatcher is started via systemd service.
    def ready(self) -> None:
        command = sys.argv[1] if len(sys.argv) > 1 else ""

        # Production startup and development startup both reach this.
        if self._should_initialize_terminology(command):
            self._initialize_terminology()

        from . import checks, signals  # noqa: F401

        if not self._should_skip_runtime_checks(command):
            checks.assert_runtime_checks_pass()

        # Everything below this point is development-server-only.
        if "runserver" not in sys.argv:
            return

        # Start the watcher in the autoreloader child, or with --noreload.
        if "--noreload" not in sys.argv and os.environ.get("RUN_MAIN") != "true":
            return

        self.start_file_watcher()

    def start_file_watcher(self) -> bool:
        from lx_annotate.file_watcher import _preload_processing_stack

        _preload_processing_stack()

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
