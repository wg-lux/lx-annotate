import os
import uuid
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import FileUploadSerializer
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

# Use the BACKEND_API_BASE_URL from your settings
BACKEND_API_BASE_URL = getattr(settings, 'BACKEND_API_BASE_URL', 'http://127.0.0.1:8000/endoreg_db/api/')

@method_decorator(csrf_exempt, name='dispatch')
class ProxyView(View):
    def get(self, request, endpoint, *args, **kwargs):
        """
        Forward GET requests.
        """
        target_url = f"{BACKEND_API_BASE_URL}{endpoint}/"
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
        target_url = f"{BACKEND_API_BASE_URL}{endpoint}/"
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
    def put(self, request, endpoint):
        target_url = f"{BACKEND_API_BASE_URL}{endpoint}/"
        if request.content_type == 'applications/json':
            payload = json.loads(request)


'''
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
'''