
class Result:
    def __init__(self, **entries):
        self.__dict__.update(entries)

import os
import uuid
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import FileUploadSerializer
from agl_anonymizer_pipeline.main import main
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

class ProcessFileView(APIView):
    # permission_classes = [IsAuthenticated]  # Optional, for secure API access

    def post(self, request, *args, **kwargs):
        serializer = FileUploadSerializer(data=request.data)

        if serializer.is_valid():
            device = request.POST.get('device', 'olympus_cv_1500')
            file = serializer.validated_data['file']
            validation = request.POST.get('validation', 'false').lower() in ['true', '1']

            # Save the uploaded file to a temporary location
            temp_file_path = os.path.join(settings.MEDIA_ROOT, file.name)
            with open(temp_file_path, 'wb') as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)

            try:
                # Get the path to the EAST model
                east_model_path = os.path.join(settings.BASE_DIR, 'agl_anonymizer', 'models', 'frozen_east_text_detection.pb')
                if not os.path.exists(east_model_path):
                    raise FileNotFoundError(f"Model file not found: {east_model_path}")

                # Call the main processing function
                output_path, stats, original_img_path = main(temp_file_path, east_path=east_model_path, device=device, validation=True)

                # Prepare the data to be sent to the endoreg client manager
                data_to_send = {
                    'image_name': os.path.basename(temp_file_path),
                    'original_image_url': original_img_path,
                    'polyp_count': 0, # Placeholder, model tba from 'polyp_count' to 0
                    'comments': "Generated during anonymization",
                    'gender_pars': stats['gender_pars'],
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

            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



