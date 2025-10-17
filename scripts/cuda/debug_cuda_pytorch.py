#!/usr/bin/env python3
"""
Detailed PyTorch CUDA debugging script
"""
import os
import sys
import subprocess

def print_section(title):
    print(f"\n{'=' * 50}")
    print(f" {title}")
    print(f"{'=' * 50}")

def run_command(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), 1

print_section("ENVIRONMENT VARIABLES")
env_vars = ['CUDA_VISIBLE_DEVICES', 'NVIDIA_VISIBLE_DEVICES', 'LD_LIBRARY_PATH', 
            'CUDA_HOME', 'PYTORCH_CUDA_ALLOC_CONF', 'PATH']
for var in env_vars:
    value = os.environ.get(var, 'NOT SET')
    if var == 'LD_LIBRARY_PATH' and value != 'NOT SET':
        print(f"{var}:")
        for path in value.split(':')[:10]:  # Show first 10 paths
            print(f"  {path}")
        print("  ... (truncated)")
    else:
        print(f"{var}: {value}")

print_section("NVIDIA DRIVER INFO")
stdout, stderr, code = run_command("nvidia-smi -q -d COMPUTE")
if code == 0:
    lines = stdout.split('\n')
    for line in lines[:20]:  # First 20 lines
        if 'Product Name' in line or 'CUDA Version' in line or 'Driver Version' in line:
            print(line.strip())
else:
    print("nvidia-smi not available or failed")

print_section("NVCC INFO")
stdout, stderr, code = run_command("nvcc --version")
if code == 0:
    print(stdout.strip())
else:
    print("nvcc not available")

print_section("PYTORCH IMPORT AND CUDA CHECK")
try:
    print("Importing torch...")
    import torch
    print("✓ PyTorch imported successfully")
    print(f"PyTorch version: {torch.__version__}")
    
    # Check CUDA compilation info
    try:
        cuda_version = torch.version.cuda
        print(f"CUDA compiled version: {cuda_version}")
    except AttributeError:
        print("CUDA compiled version: Not available")
    
    print(f"cuDNN version: {torch.backends.cudnn.version() if torch.backends.cudnn.is_available() else 'Not available'}")
    
    print("\nCUDA availability check...")
    cuda_available = torch.cuda.is_available()
    print(f"torch.cuda.is_available(): {cuda_available}")
    
    if cuda_available:
        print(f"Device count: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"Device {i}: {torch.cuda.get_device_name(i)}")
            print(f"  Memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.1f} GB")
    else:
        print("CUDA is not available - investigating...")
        
        # Try to get more detailed error info
        print("\nTrying to force CUDA initialization...")
        try:
            # This should trigger CUDA initialization and show any errors
            torch.cuda.init()
            print("CUDA initialization successful")
        except Exception as e:
            print(f"CUDA initialization failed: {e}")
            
        print("\nChecking CUDA runtime...")
        try:
            torch.cuda.current_device()
            print("CUDA runtime accessible")
        except Exception as e:
            print(f"CUDA runtime error: {e}")
            
        print("\nChecking for CUDA libraries...")
        import ctypes
        try:
            # Try to load CUDA runtime library
            libcudart = ctypes.CDLL('libcudart.so.12')
            print("✓ libcudart.so.12 loaded successfully")
        except Exception as e:
            print(f"✗ Failed to load libcudart.so.12: {e}")
            
        try:
            libcuda = ctypes.CDLL('libcuda.so.1')
            print("✓ libcuda.so.1 loaded successfully")
        except Exception as e:
            print(f"✗ Failed to load libcuda.so.1: {e}")

except ImportError as e:
    print(f"✗ Failed to import torch: {e}")
except Exception as e:
    print(f"✗ Error during PyTorch testing: {e}")
    import traceback
    traceback.print_exc()

print_section("CUDA LIBRARY SEARCH")
print("Searching for CUDA libraries in LD_LIBRARY_PATH...")
ld_path = os.environ.get('LD_LIBRARY_PATH', '')
cuda_libs = ['libcudart.so', 'libcuda.so', 'libcublas.so']

for path in ld_path.split(':'):
    if path and os.path.exists(path):
        try:
            files = os.listdir(path)
            cuda_files = [f for f in files if any(lib in f for lib in cuda_libs)]
            if cuda_files:
                print(f"\nFound in {path}:")
                for f in cuda_files[:5]:  # Show first 5 matches
                    print(f"  {f}")
        except PermissionError:
            continue

print_section("SYSTEM CUDA LIBRARIES")
stdout, stderr, code = run_command("find /run/opengl-driver -name '*cuda*' 2>/dev/null")
if stdout.strip():
    print("CUDA libraries in /run/opengl-driver:")
    for line in stdout.strip().split('\n'):
        print(f"  {line}")

stdout, stderr, code = run_command("find /usr/lib -name '*cuda*' 2>/dev/null")
if stdout.strip():
    print("\nCUDA libraries in /usr/lib:")
    for line in stdout.strip().split('\n')[:10]:  # First 10
        print(f"  {line}")
