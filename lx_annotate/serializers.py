from rest_framework import serializers

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

class VideoSerializer(serializers.Serializer):
    video = serializers.FileField()
