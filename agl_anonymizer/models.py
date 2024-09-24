from django.db import models
from django.utils import timezone

class UploadedFile(models.Model):
    original_file = models.FileField(upload_to='uploads/original/')
    upload_date = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.original_file.name
    
class AnonymizedFile(models.Model):
    original_file = models.OneToOneField(UploadedFile, on_delete=models.CASCADE, related_name='anonymized_file')
    anonymized_file = models.FileField(upload_to='uploads/anonymized/')
    anonymization_date = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"Anonymized version of {self.original_file.original_file.name}"
