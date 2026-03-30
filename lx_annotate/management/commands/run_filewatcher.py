from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Run the lx-annotate file watcher service."

    def add_arguments(self, parser):
        parser.add_argument(
            "--log-level",
            dest="log_level",
            default=None,
            help="Override WATCHER_LOG_LEVEL for this process.",
        )

    def handle(self, *args, **options):
        log_level = options.get("log_level")
        if log_level:
            import os

            os.environ["WATCHER_LOG_LEVEL"] = str(log_level)

        from lx_annotate.file_watcher import run_file_watcher

        self.stdout.write(self.style.SUCCESS("Starting file watcher service"))
        try:
            run_file_watcher()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("File watcher interrupted"))
        except Exception as exc:
            raise CommandError(str(exc)) from exc
