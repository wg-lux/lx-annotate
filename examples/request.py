import requests
import os


# Get the directory of the current script
base_dir = os.path.dirname(os.path.abspath(__file__))

# Define the path to a image file located in the 'exaples' folder
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
