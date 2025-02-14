## lx-annotate - API

lxAnonymizer is a Django-based API that interacts with the lxAnonymizer Pipeline. This API is designed to facilitate the seamless integration of the anonymization functionalities in lxAnonymizer into new applications, ensuring privacy and compliance with data protection regulations.

## Disclaimer

This is a study version of the program. Later Versions could one day provide full anonymization of patient data. However, at the current state no warranty for the quality of results can be given.
Names used in the name generation dictionary are entirely handpicked from data generated by AI (ChatGPT). No Resemblance to actual people, living or dead, is intended.

## Features of this Repository

- **Text Pseudonymization Interface**
- **Sending And Recieving Data**
- **Image Saving**
- **Extensive Format Support**

## Functionality

When this project is started, a Django REST API is set up. This API can be called with a provided image path. Once the anonymization is complete, an image path to a anonymized result will be returned as a response.

## Installation

Lx-annotate is set up by a devenv.nix and uv2nix automatically. This file defines all inputs to the program, enables CUDA on the system and then sets up a python environment containing all the dependencies. To start the installation follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/wg-lux/lx-annotate.git
   cd lx-annotate
   ```

2. **Adding packages**:
   First you need to add the packages to pyproject.toml,
   then uv will handle the installation through devenv

   ```bash
   uv sync
   ```

3. **Download the Text Detection Model**:
   If the automatic download from github fails, ownload a text detection model, such as `frozen_east_text_detection.pb`, and place it in the appropriate directory of a local version of agl_anonymizer_pipeline. All models are downloaded automatically.

## Usage

To use the lx-anonymizer API, follow these steps:

1. **Prepare Your Images**:
   Place the images you want to process in a designated folder.

2. **Configure Settings**:
   Adjust settings in the settings.py file

2.5. **Setup Frontend**

    ```bash
        direnv allow
        cd frontend
        direnv allow
        npm install
        npm run build
        cd ..
    ```

3. **Run the Django Server**:

   ```bash
   python manage.py runserver
   ```

4. **Make API Requests**:
   Use an API client like Postman, cURL, or the `requests` library in Python to interact with the lxAnonymizer API. Example request using the `requests` library:

   ```python
   import requests
   import os

   # Get the directory of the current script
   base_dir = os.path.dirname(os.path.abspath(__file__))

   # Define the path to the image file located in the 'requests_agl_anonymizer' folder
   image_path = os.path.join(base_dir, 'frame_0.jpg')

   # Ensure the file exists
   if not os.path.exists(image_path):
       raise FileNotFoundError(f"No such file or directory: '{image_path}'")

   # Define the URL of the Django API endpoint
   url = 'http://127.0.0.1:8000/process/'

   # Open the file in binary mode and send it as part of the multipart form-data payload
   with open(image_path, 'rb') as image_file:
       files = {
           'file': image_file,
       }
       data = {
           'title': 'Example Image',
       }
       response = requests.post(url, files=files, data=data)

   # Print the response from the server
   print(response.status_code)
   print(response.json())  # Assuming the server returns a JSON response
   ```

# API Endpoint: Process File

This API endpoint allows users to upload a file (image) for anonymization and further processing. The file can be processed in two modes:

Validation Mode: When enabled, the processed data will be sent to the Endoreg Client Manager for validation and saving.
Non-validation Mode: The processed file and the original image are saved, and their URLs are returned in the response.

## URL

POST /process-file/

## Parameters

1. file: The image file to be processed (required).
2. device: The device name (optional). Default is olympus_cv_1500.
3. validation: A flag to indicate if the validation mode is enabled (optional). Can be true or false. Default is false.

## Request Example (Non-validation Mode)

```bash
curl -X POST http://<your-server>/process-file/ \
    -F "file=@/path/to/your/image.jpg" \
    -F "device=olympus_cv_1500" \
    -F "validation=false"
```

## Request Example (Validation Mode)

```bash
curl -X POST http://<your-server>/process-file/ \
    -F "file=@/path/to/your/image.jpg" \
    -F "device=olympus_cv_1500" \
    -F "validation=true"
Response (Non-validation Mode)
```

If the validation mode is disabled, the API will return URLs for both the processed file and the original image.

```json
{
  "status": "success",
  "message": "Processing completed",
  "processed_file_url": "<url-to-processed-file>",
  "original_image_url": "<url-to-original-image>",
  "gender_pars": {
    "male": 0.6,
    "female": 0.4
  }
}
```

## Response (Validation Mode)

If validation mode is enabled, the processed data will be sent to the Endoreg Client Manager to be displayed later once the user logs into the AGL Validator. The API will return the following response:

**-> For this to work, the correct url must be defined inside of settings.py **

```json
{
  "status": "success",
  "message": "Processing completed and data sent to endoreg client manager",
  "api_response": {
    "status": "ok",
    "message": "Data saved successfully"
  }
}
```

## Error Handling

If the API encounters any error during processing, it will return a response with the error message and the stack trace for debugging purposes.

```json
{
  "error": "Description of the error",
  "traceback": "Detailed traceback for debugging"
}
```

### UploadedFile

Represents an uploaded file with fields for the original file, upload date, and an optional description.

```python
from django.db import models
from django.utils import timezone

class UploadedFile(models.Model):
    original_file = models.FileField(upload_to='uploads/original/')
    upload_date = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.original_file.name

```
