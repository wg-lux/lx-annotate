from rest_framework import serializers
# Import the advanced LabelVideoSegmentSerializer from endoreg_db


class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class VideoSerializer(serializers.Serializer):
    video = serializers.FileField()


# LabelVideoSegmentSerializer is now imported from endoreg_db
# The endoreg_db version includes:
# - Support for both time-based and frame-based segmentation
# - Automatic label creation from names
# - Support for both Label and VideoSegmentationLabel models
# - Comprehensive validation and error handling
# - Logging capabilities
# - Better video name handling
