from typing import Any, Optional

torch: Optional[Any] = None
try:
    import torch as _torch  # type: ignore
    torch = _torch
    TORCH_AVAILABLE = True
except Exception as e:
    print(f"gpu-check: PyTorch not available ({e}); skipping GPU diagnostics.")
    TORCH_AVAILABLE = False

# Define a function which creates a file (YYYY-MM-DD_HH-MM-SS.txt) in the directory "./data" and writes a message to it

def write_message(message=None, save=False):
    import os
    import datetime

    # Create a directory if it does not exist
    os.makedirs("data", exist_ok=True)

    if not message and TORCH_AVAILABLE and torch is not None:
        # print whether cuda is available, device name, total memory and multiprocessor count
        message = "Hello from nix-python-devenv (with cuda support)!\n"
        message += f"Cuda is available: {torch.cuda.is_available()}\n"
        message += f"Number of usable devices: {torch.cuda.device_count()}\n"
        message += "\n"

        for i in range(torch.cuda.device_count()):
            properties = torch.cuda.get_device_properties(i)
            message += f"Device {i}: {properties.name}\n"
            message += f"  Total Memory: {properties.total_memory / (1024 ** 2):.2f} MB\n"
            message += f"  Multiprocessor Count: {properties.multi_processor_count}\n"
            message += "\n"

    # Get the current date and time
    now = datetime.datetime.now()
    date_time = now.strftime("%Y-%m-%d_%H-%M-%S")

    # Create a file with the current date and time
    if not save:
        return None
    
    file_name = f"data/{date_time}.txt"
    with open(file_name, "w") as file:
        file.write(message or "")

    return file_name

def main():
    if not TORCH_AVAILABLE or torch is None:
        # Exit successfully without GPU probing
        return

    print("Hello from nix-python-devenv (with cuda support)!")
    print("Cuda is available:", torch.cuda.is_available())

    num_of_gpus = torch.cuda.device_count()
    print("Number of usable devices:", num_of_gpus)

    for i in range(num_of_gpus):
        properties = torch.cuda.get_device_properties(i)
        print(f"Device {i}: {properties.name}")
        print(f"  Total Memory: {properties.total_memory / (1024 ** 2):.2f} MB")
        print(f"  Multiprocessor Count: {properties.multi_processor_count}")


if __name__ == "__main__":
    main()
