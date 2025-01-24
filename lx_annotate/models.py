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
    file = models.ForeignKey("lx_annotate.AnonymizedFile", verbose_name=("box"), on_delete=models.CASCADE, related_name=("anonymized_boxes"))
    text_recognized = models.CharField(max_length=255, blank=True, null=True)
    tag = models.CharField(max_length=255, blank=True, null=True)
    ner_entity_text = models.CharField(max_length=255, blank=True, null=True)
    ocr_confidence = models.FloatField(blank=True, null=True)
    x = models.IntegerField()
    y = models.IntegerField()
    width = models.IntegerField()
    height = models.IntegerField()
    
    def initiate(self, text, text_imp, tag, startX, startY, endX, endY):
        self.text_recognized = text
        self.text_imputed = text_imp
        self.tag = tag
        self.x = startX
        self.y = startY
        self.width = endX
        self.height = endY
        
    def set_box(self, startX, startY, endX, endY):
        self.x = startX
        self.y = startY
        self.width = endX
        self.height = endY
        
    def set_recognized_text(self, text):
        self.text_recognized = text
        
    def set_imputed_text(self, text):
        self.text_imputed = text
    
    def __str__(self):
        return f"Anonymized Box ({self.x}, {self.y}), size ({self.width}x{self.height}, automatic recognitiion: {self.text_recognized}, manual imputation: {self.text_imputed}, tag: {self.tag})"        

class AnnotatedBox(models.Model):
    file = models.ForeignKey("lx_annotate.AnonymizedBox", verbose_name=("annotated_box"), on_delete=models.CASCADE, related_name=("annotated_boxes"))
    annotated_text = models.CharField(max_length=255, blank=True, null=True)    
    new_x = models.IntegerField()
    new_y = models.IntegerField()
    new_width = models.IntegerField()
    new_height = models.IntegerField()
    offset_x = models.IntegerField()
    offset_y = models.IntegerField()
    offset_width = models.IntegerField()
    offset_height = models.IntegerField()
        
    def set_box(self, startX, startY, endX, endY):
        self.new_x = startX
        self.new_y = startY
        self.new_width = endX
        self.new_height = endY
    
    def set_annotated_text(self, text):
        self.annotated_text = text
        return self
    
    def set_offset(self, offsetX, offsetY, offsetWidth, offsetHeight):
        self.offset_x = AnonymizedBox.x - self.new_x
        self.offset_y = AnonymizedBox.y - self.new_y
        self.offset_width = AnonymizedBox.width - self.new_width
        self.offset_height = AnonymizedBox.height - self.new_height
        return self
        
    def __str__(self):
        return f"Annotated Box ({self.new_x}, {self.new_y}), size ({self.new_width}x{self.new_height}, offset ({self.offset_x}, {self.offset_y}, {self.offset_width}, {self.offset_height})"

    
        

    