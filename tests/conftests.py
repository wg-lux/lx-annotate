import os


def pytest_configure(config):
    # This forces the environment variable to the test settings
    # before pytest-django starts looking for it.
    os.environ["DJANGO_SETTINGS_MODULE"] = "lx_annotate.settings.settings_test"
