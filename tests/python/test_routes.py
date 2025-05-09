from operator import call
import os, subprocess
import pytest
from django.test import TestCase

from django.urls import reverse
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files import File
from django.core.management import call_command



def show_urls():
    """Print all URLs in the Django project."""
    from django.core.management import call_command
    from django.urls import get_resolver

    urlconf = get_resolver()
    urlpatterns = urlconf.url_patterns
    

    for pattern in urlpatterns:
        print(pattern)
    
    call_command('show_urls', '--format=plain')
    
    print("URLs in the Django project:")
    
def test_show_urls() -> bool:
    """Test function to show URLs."""
    try:
        show_urls()
        return True
    except Exception as e:
        print(f"Error showing URLs: {e}")
        return False

    