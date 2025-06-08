import os
import uuid
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import FileUploadSerializer, LabelVideoSegmentSerializer
#from lx_anonymizer import main
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from shutil import copyfile
import json
import requests
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from urllib.parse import urljoin

from django.http import FileResponse
from rest_framework.decorators import api_view
from django.shortcuts import get_object_or_404
import logging

from endoreg_db.models import VideoFile, LabelVideoSegment, Label

logger = logging.getLogger(__name__)

def serve_video(request):
    # Open the video file in binary mode.
    video_file = open('path/to/video.mp4', 'rb')
    return FileResponse(video_file, content_type='video/mp4')

# Use the BACKEND_API_BASE_URL from your settings
BACKEND_API_BASE_URL = getattr(settings, 'BACKEND_API_BASE_URL', 'http://127.0.0.1:8000')

@method_decorator(csrf_exempt, name='dispatch')
class ProxyView(View):
    def get(self, request, endpoint, *args, **kwargs):
        """
        Forward GET requests.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}")        
        # Forward query parameters from the original request
        response = requests.get(target_url, params=request.GET)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)

    def post(self, request, endpoint, *args, **kwargs):
        """
        Forward POST requests.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}/")        
        # Determine the payload based on the content type
        if request.content_type == 'application/json':
            payload = json.loads(request.body.decode('utf-8'))
            response = requests.post(target_url, json=payload)
        else:
            # For form-encoded or multipart, forward POST data as-is
            response = requests.post(target_url, data=request.POST)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)
    
    def put(self, request, endpoint, *args, **kwargs):
        """
        Forward PUT requests.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}")        
        # Check the content type and prepare payload accordingly
        if request.content_type == 'application/json':
            try:
                payload = json.loads(request.body.decode('utf-8'))
            except ValueError:
                return JsonResponse({'error': 'Invalid JSON payload'}, status=400)
            response = requests.put(target_url, json=payload)
        elif request.content_type.startswith('multipart/form-data'):
            # Build files dictionary for binary data (video files, etc.)
            files = {
                key: (file_obj.name, file_obj, file_obj.content_type)
                for key, file_obj in request.FILES.items()
            }
            # Forward both POST data and files
            response = requests.post(target_url, data=request.POST, files=files)
        elif request.content_type == 'video/mp4':
            # For binary data (e.g., video files), forward as-is
            response = requests.put(target_url, data=request.body, headers={'Content-Type': request.content_type})
        else:
            # For non-JSON payloads, forward data as-is (e.g., form data)
            response = requests.put(target_url, data=request.POST)
        
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)
    
    def delete(self, request, endpoint, *args, **kwargs):
        """
        Forward DELETE requests.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}")        
        response = requests.delete(target_url)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)
    
    def patch(self, request, endpoint, *args, **kwargs):
        """
        Forward PATCH requests.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}")        
        if request.content_type == 'application/json':
            try:
                payload = json.loads(request.body.decode('utf-8'))
            except ValueError:
                return JsonResponse({'error': 'Invalid JSON payload'}, status=400)
            response = requests.patch(target_url, json=payload)
        else:
            response = requests.patch(target_url, data=request.POST)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)
    
    def trace(self, request, endpoint, *args, **kwargs):
        """
        Forward TRACE requests.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}")        
        response = requests.request("TRACE", target_url, params=request.GET, data=request.body)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)

    def connect(self, request, endpoint, *args, **kwargs):
        """
        Forward CONNECT requests.
        Note: CONNECT is typically used for tunneling (e.g., HTTPS proxies) and may not work
        as expected in this context.
        """
        target_url = urljoin(BACKEND_API_BASE_URL, f"{endpoint}")        
        response = requests.request("CONNECT", target_url, params=request.GET, data=request.body)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        return JsonResponse(data, status=response.status_code, safe=False)


class ProcessFileView(APIView):
    # permission_classes = [IsAuthenticated]  # Optional, for secure API access

    def post(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data)

        if serializer.is_valid():
            device = request.POST.get('device', 'olympus_cv_1500')
            file = serializer.validated_data['file']
            validation = request.POST.get('validation', 'false').lower() in ['true', '1']

            # Save the uploaded file to a temporary location within MEDIA_ROOT
            temp_file_name = f"{uuid.uuid4()}_{file.name}"
            temp_file_path = os.path.join(settings.MEDIA_ROOT, 'temp', temp_file_name)
            os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
            with open(temp_file_path, 'wb') as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)

            try:

                # Call the main processing function
                output_path, data, original_img_path = main(
                    temp_file_path,
                    device=device,
                    validation=validation
                )

                if validation:
                    anonymized_data = None
                    # Prepare the data to be sent to the endoreg client manager
                    data_to_send = {
                        'image_name': os.path.basename(temp_file_path),
                        'original_image_url': original_img_path,
                        'polyp_count': 0,  # Placeholder, model to be added
                        'comments': "Generated during anonymization",
                        'gender_pars': data['gender_pars'],
                        'processed_file': output_path
                    }

                    # Send data to the endoreg client manager for saving
                    api_url = "http://127.0.0.1:8001/validate-and-save/"  # The endpoint in the endoreg client manager
                    headers = {'Content-Type': 'application/json'}
                    response = requests.post(api_url, json=data_to_send, headers=headers)

                    if response.status_code != 200:
                        raise Exception(f"Error sending data to client manager: {response.text}")

                    return JsonResponse({
                        'status': 'success',
                        'message': 'Processing completed and data sent to endoreg client manager',
                        'api_response': response.json(),
                    }, status=status.HTTP_200_OK)
                else:
                    # When validation is False, save the output files to MEDIA_ROOT and return their URLs

                    # Generate unique filenames to avoid conflicts
                    processed_filename = f"{uuid.uuid4()}_{os.path.basename(output_path)}"
                    original_filename = f"{uuid.uuid4()}_{os.path.basename(original_img_path)}"

                    processed_file_destination = os.path.join(settings.MEDIA_ROOT, 'processed', processed_filename)
                    original_file_destination = os.path.join(settings.MEDIA_ROOT, 'original', original_filename)

                    # Ensure the directories exist
                    os.makedirs(os.path.dirname(processed_file_destination), exist_ok=True)
                    os.makedirs(os.path.dirname(original_file_destination), exist_ok=True)

                    # Copy the files to MEDIA_ROOT
                    copyfile(output_path, processed_file_destination)
                    copyfile(original_img_path, original_file_destination)

                    # Build URLs to access the files
                    processed_file_url = request.build_absolute_uri(settings.MEDIA_URL + 'processed/' + processed_filename)
                    original_image_url = request.build_absolute_uri(settings.MEDIA_URL + 'original/' + original_filename)

                    return JsonResponse({
                        'status': 'success',
                        'message': 'Processing completed',
                        'processed_file_url': processed_file_url,
                        'original_image_url': original_image_url,
                        'gender_pars': stats['gender_pars'],
                    }, status=status.HTTP_200_OK)

            except Exception as e:
                import traceback
                traceback_str = traceback.format_exc()
                return Response({'error': str(e), 'traceback': traceback_str}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST', 'GET'])
def video_segments_view(request):
    """
    Handle video segment creation and listing.
    POST: Create a new label video segment
    GET: List all segments (with optional video_id filter)
    """
    if request.method == 'POST':
        serializer = LabelVideoSegmentSerializer(data=request.data)
        if serializer.is_valid():
            try:
                segment = serializer.save()
                return Response(
                    LabelVideoSegmentSerializer(segment).data, 
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                logger.error(f"Error creating video segment: {str(e)}")
                return Response(
                    {'error': f'Failed to create segment: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'GET':
        # Optional filtering by video_id
        video_id = request.GET.get('video_id')
        if video_id:
            try:
                video = VideoFile.objects.get(id=video_id)
                segments = video.label_video_segments.all()
            except VideoFile.DoesNotExist:
                return Response(
                    {'error': f'Video with id {video_id} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            segments = LabelVideoSegment.objects.all()
        
        serializer = LabelVideoSegmentSerializer(segments, many=True)
        return Response(serializer.data)

@api_view(['GET', 'PUT', 'DELETE'])
def video_segment_detail_view(request, segment_id):
    """
    Handle individual video segment operations.
    GET: Retrieve segment details
    PUT: Update segment
    DELETE: Delete segment
    """
    segment = get_object_or_404(LabelVideoSegment, id=segment_id)
    
    if request.method == 'GET':
        serializer = LabelVideoSegmentSerializer(segment)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = LabelVideoSegmentSerializer(segment, data=request.data, partial=True)
        if serializer.is_valid():
            try:
                segment = serializer.save()
                return Response(LabelVideoSegmentSerializer(segment).data)
            except Exception as e:
                logger.error(f"Error updating video segment {segment_id}: {str(e)}")
                return Response(
                    {'error': f'Failed to update segment: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        try:
            segment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting video segment {segment_id}: {str(e)}")
            return Response(
                {'error': f'Failed to delete segment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
