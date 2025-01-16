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


class AnnotatedFile(models.Model):
    original_file = models.OneToOneField(AnonymizedFile, on_delete=models.CASCADE, related_name='annotated_file')
    annotated_file = models.FileField(upload_to='uploads/annotated/')
    annotation_date = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"Annotated anonymized version od {self.original_file.original_file.name}"
    
class AnonymizedBox(models.Model):
    file = models.ForeignKey("app.AnonymizedFile", verbose_name=("box"), on_delete=models.CASCADE, related_name=("anonymized_boxes"))
    first_name_recognized = models.CharField(max_length=255, blank=True, null=True)
    last_name_recognized = models.CharField(max_length=255, blank=True, null=True)
    first_name_imputation = models.CharField(max_length=255, blank=True, null=True)
    last_name_imputation = models.CharField(max_length=255, blank=True, null=True)
    x = models.IntegerField()
    y = models.IntegerField()
    width = models.IntegerField()
    height = models.IntegerField()
    
    def initiate(self, first_name, first_name_imp, last_name, last_name_imp, startX, startY, endX, endY):
        self.first_name_recognized = first_name
        self.last_name_recognized = last_name
        self.first_name_imputation = first_name_imp
        self.last_name_imputation = last_name_imp
        self.x = startX
        self.y = startY
        self.width = endX
        self.height = endY
        
    def set_box(self, startX, startY, endX, endY):
        self.x = startX
        self.y = startY
        self.width = endX
        self.height = endY
    
    def __str__(self):
        return f"Anonymized Box ({self.x}, {self.y}), size ({self.width}x{self.height}, automatic recognitiion: {self.first_name_recognized}, {self.last_name_recognized}, imputation: {self.first_name_imputation}, {self.last_name_imputation})"
        

class AnnotatedBox(models.Model):
    file = models.OneToOneField("app.AnonymizedBox", verbose_name=("annotated_box"), on_delete=models.CASCADE, related_name=("annotated_boxes"))
    first_name_recognized = models.CharField(max_length=255, blank=True, null=True)
    last_name_recognized = models.CharField(max_length=255, blank=True, null=True)
    first_name_annotation = models.CharField(max_length=255, blank=True, null=True)
    last_name_annotation = models.CharField(max_length=255, blank=True, null=True)
    first_name_imputation = models.CharField(max_length=255)
    last_name_imputation = models.CharField(max_length=255)
    
    x = models.IntegerField()
    y = models.IntegerField()
    width = models.IntegerField()
    height = models.IntegerField()
        
    def set_box(self, startX, startY, endX, endY):
        self.x = startX
        self.y = startY
        self.width = endX
        self.height = endY
        
    def annotate(self, first_name, last_name, startX, startY, endX, endY):
        self.first_name_annotated = first_name
        self.last_name_annotated = last_name
        self.x = startX
        self.y = startY
        self.width = endX
        self.height = endY
        
    def __str__(self):
        return f"Annotated Box ({self.x}, {self.y}), size ({self.width}x{self.height}, automatic recognitiion: {self.first_name_recognized}, {self.last_name_recognized}, manual annotation: {self.first_name_annotation}, {self.last_name_annotation})"


    
        

    