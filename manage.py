#!/nix/store/lpi16513bai8kg2bd841745vzk72475x-python3-3.11.9/bin/python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import subprocess


def main():
    """Run administrative tasks."""
    # Use the environment variable from .env, with fallback to dev settings
    default_settings = os.environ.get('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings.dev')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', default_settings)
    
    try:
        try:
            from django.core.management import execute_from_command_line
        except ImportError:
            subprocess.run(["uv", "sync"], check=True)
            from django.core.management import execute_from_command_line
    except ImportError as exc:
        
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
