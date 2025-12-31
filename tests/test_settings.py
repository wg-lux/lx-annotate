from django.conf import settings


def test_which_settings_are_used():
    # Replace 'settings_test' with a unique value only found in your test settings
    # e.g., if you set DEBUG=False in tests but True in dev:
    print(f"DEBUG is: {settings.DEBUG}")
    print(f"Database is: {settings.DATABASES['default']['ENGINE']}")
    assert "settings_test" in settings.SETTINGS_MODULE
