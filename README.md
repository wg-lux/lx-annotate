# AGL Anonymizer

AGL Anonymizer is a Django-based API that interacts with the AGL Anonymizer Pipeline to provide comprehensive image processing capabilities, specifically for anonymizing sensitive information using common German names, blurring, and OCR (Optical Character Recognition). This API is designed to facilitate the seamless integration of anonymization functionalities into various applications, ensuring privacy and compliance with data protection regulations.

## Features of the pipeline

- **Text Detection and Anonymization**: Leverages advanced OCR techniques to detect and anonymize text within images, safeguarding sensitive information.
- **Blurring Functionality**: Includes customizable blurring options to obscure specific areas of an image, enhancing privacy.
- **Image Saving**: Efficiently saves processed images in the desired format while maintaining high-quality output.
- **Extensive Format Support**: Capable of handling various image and document formats for diverse applications.
- Pdf,
- 

## Installation

To get started with AGL Anonymizer, follow these steps:

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/wg-lux/agl_anonymizer.git
    cd agl_anonymizer
    ```

2. **Set Up the Development Environment**:
    ```bash
    nix develop
    ```

3. **Install Dependencies**:
    Ensure you have all required dependencies installed. Refer to `pypoetry.toml` for a list of dependencies.

4. **Download the Text Detection Model**:
    Download a text detection model, such as `frozen_east_text_detection.pb`, and place it in the appropriate directory.

## Usage

To use the AGL Anonymizer API, follow these steps:

1. **Prepare Your Images**:
   Place the images you want to process in a designated folder.

2. **Configure Settings**:
   Adjust settings in the configuration file (if applicable) to suit your anonymizing and blurring needs.

3. **Run the Django Server**:
    ```bash
    python manage.py runserver
    ```

4. **Make API Requests**:
   Use an API client like Postman, cURL, or the `requests` library in Python to interact with the AGL Anonymizer API. Example request using the `requests` library:

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

## API Endpoints

- **/process/**: Endpoint to upload images and receive anonymized results.

## Modules

AGL Anonymizer API comprises several key modules:

- **OCR Module**: Detects and extracts text from images.
- **Anonymizer Module**: Applies anonymization techniques to identified sensitive text regions.
- **Blur Module**: Provides functions to blur specific areas in the image.
- **Save Module**: Handles the saving of processed images in a chosen format.

## Models

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
