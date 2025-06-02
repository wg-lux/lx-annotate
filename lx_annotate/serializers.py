from rest_framework import serializers
from endoreg_db.models import LabelVideoSegment, VideoFile, Label, InformationSource

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

class VideoSerializer(serializers.Serializer):
    video = serializers.FileField()

class LabelVideoSegmentSerializer(serializers.ModelSerializer):
    """Serializer for creating and retrieving LabelVideoSegment instances."""
    
    # Additional fields for convenience
    start_time = serializers.FloatField(write_only=True, required=False, help_text="Start time in seconds")
    end_time = serializers.FloatField(write_only=True, required=False, help_text="End time in seconds")
    video_id = serializers.IntegerField(write_only=True, help_text="Video file ID")
    label_id = serializers.IntegerField(write_only=True, required=False, help_text="Label ID")
    
    # Read-only fields for response
    label_name = serializers.CharField(source='label.name', read_only=True)
    video_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = LabelVideoSegment
        fields = [
            'id',
            'start_frame_number',
            'end_frame_number',
            'start_time',
            'end_time',
            'video_id',
            'label_id',
            'label_name',
            'video_name',
        ]
        read_only_fields = ['id', 'label_name', 'video_name']
    
    def get_video_name(self, obj):
        """Get a display name for the video."""
        try:
            video = obj.get_video()
            return getattr(video, 'original_file_name', f'Video {video.id}')
        except:
            return 'Unknown Video'
    
    def create(self, validated_data):
        """Create a new LabelVideoSegment instance."""
        # Extract convenience fields
        video_id = validated_data.pop('video_id')
        label_id = validated_data.pop('label_id', None)
        start_time = validated_data.pop('start_time', None)
        end_time = validated_data.pop('end_time', None)
        
        # Get the video file
        try:
            video_file = VideoFile.objects.get(id=video_id)
        except VideoFile.DoesNotExist:
            raise serializers.ValidationError(f"VideoFile with id {video_id} does not exist")
        
        # Get the label if provided
        label = None
        if label_id:
            try:
                label = Label.objects.get(id=label_id)
            except Label.DoesNotExist:
                raise serializers.ValidationError(f"Label with id {label_id} does not exist")
        
        # Calculate frame numbers from time if provided
        if start_time is not None and 'start_frame_number' not in validated_data:
            fps = getattr(video_file, 'fps', 30)  # Default to 30 fps if not available
            validated_data['start_frame_number'] = int(start_time * fps)
        
        if end_time is not None and 'end_frame_number' not in validated_data:
            fps = getattr(video_file, 'fps', 30)  # Default to 30 fps if not available
            validated_data['end_frame_number'] = int(end_time * fps)
        
        # Get or create a default information source for manual annotations
        source, created = InformationSource.objects.get_or_create(
            name='Manual Annotation',
            defaults={
                'description': 'Manually created label segments via web interface',
                'source_type': 'manual'
            }
        )
        
        # Create the segment using the model's create_from_video method
        segment = LabelVideoSegment.create_from_video(
            source=video_file,
            prediction_meta=None,  # No prediction meta for manual annotations
            label=label,
            start_frame_number=validated_data['start_frame_number'],
            end_frame_number=validated_data['end_frame_number']
        )
        
        # Set the information source
        segment.source = source
        segment.save()
        
        return segment
