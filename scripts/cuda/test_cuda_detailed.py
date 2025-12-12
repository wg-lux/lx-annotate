#!/usr/bin/env python3
"""
Detailed CUDA diagnostics script
"""
import os
import sys
import subprocess

print("=== CUDA Diagnostic Script ===\n")

# 1. Environment variables
print("1. CUDA Environment Variables:")
cuda_env_vars = ['CUDA_HOME', 'CUDA_PATH', 'CUDA_ROOT', 'CUDA_VISIBLE_DEVICES', 'NVIDIA_VISIBLE_DEVICES']
for var in cuda_env_vars:
    value = os.environ.get(var, 'Not set')
    print(f"   {var}: {value}")

print(f"   LD_LIBRARY_PATH: {os.environ.get('LD_LIBRARY_PATH', 'Not set')[:100]}...")

# 2. System NVIDIA info
print("\n2. System NVIDIA Information:")
try:
    result = subprocess.run(['nvidia-smi', '--query-gpu=name,driver_version,cuda_version', '--format=csv,noheader'], 
                          capture_output=True, text=True, timeout=10)
    if result.returncode == 0:
        print(f"   GPU: {result.stdout.strip()}")
    else:
        print(f"   nvidia-smi error: {result.stderr.strip()}")
except Exception as e:
    print(f"   nvidia-smi unavailable: {e}")

# 3. Python CUDA packages
print("\n3. Python CUDA Packages:")
import pkg_resources
nvidia_packages = [pkg for pkg in pkg_resources.working_set if 'nvidia' in pkg.project_name.lower()]
for pkg in sorted(nvidia_packages, key=lambda x: x.project_name):
    print(f"   {pkg.project_name}: {pkg.version}")

# 4. PyTorch CUDA info
print("\n4. PyTorch CUDA Information:")
try:
    import torch
    print(f"   PyTorch version: {torch.__version__}")
    print(f"   CUDA compiled version: {torch.version.cuda}")
    print(f"   CUDA available: {torch.cuda.is_available()}")
    print(f"   Device count: {torch.cuda.device_count()}")
    
    # Try to get more detailed error
    if not torch.cuda.is_available():
        print("\n5. Detailed CUDA Initialization:")
        try:
            # Try to access CUDA context directly
            print("   Attempting torch.cuda.init()...")
            torch.cuda.init()
            print("   SUCCESS: torch.cuda.init()")
        except Exception as e:
            print(f"   FAILED: torch.cuda.init() - {e}")
        
        try:
            # Try to create a CUDA context
            print("   Attempting to create CUDA context...")
            import torch.cuda
            if hasattr(torch.cuda, '_lazy_init'):
                torch.cuda._lazy_init()
                print("   SUCCESS: torch.cuda._lazy_init()")
        except Exception as e:
            print(f"   FAILED: torch.cuda._lazy_init() - {e}")
            
        # Check if we can find CUDA libraries
        print("   Searching for CUDA libraries in LD_LIBRARY_PATH...")
        ld_path = os.environ.get('LD_LIBRARY_PATH', '')
        cuda_libs_found = []
        for path in ld_path.split(':'):
            if os.path.exists(path):
                try:
                    files = os.listdir(path)
                    cuda_files = [f for f in files if 'cuda' in f.lower()]
                    if cuda_files:
                        cuda_libs_found.extend([os.path.join(path, f) for f in cuda_files[:3]])  # Show first 3
                except:
                    pass
        
        if cuda_libs_found:
            print("   Found CUDA libraries:")
            for lib in cuda_libs_found[:5]:  # Show first 5
                print(f"     {lib}")
        else:
            print("   No CUDA libraries found in LD_LIBRARY_PATH")
    else:
        print("\n5. CUDA Device Information:")
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            print(f"   Device {i}: {props.name}")
            print(f"     Memory: {props.total_memory / (1024**3):.1f} GB")
            print(f"     Compute Capability: {props.major}.{props.minor}")
            
except ImportError as e:
    print(f"   PyTorch not available: {e}")

# 6. Try alternative CUDA detection
print("\n6. Alternative CUDA Detection:")
try:
    # Try ctypes approach to load CUDA directly
    import ctypes
    try:
        # Try to load libcuda.so directly
        cuda_lib = ctypes.CDLL("libcuda.so.1")
        print("   SUCCESS: Loaded libcuda.so.1 directly")
        
        # Try to initialize CUDA
        cuda_init = cuda_lib.cuInit
        cuda_init.argtypes = [ctypes.c_uint]
        cuda_init.restype = ctypes.c_int
        
        result = cuda_init(0)
        print(f"   cuInit(0) result: {result} ({'SUCCESS' if result == 0 else 'FAILED'})")
        
        if result == 0:
            # Try to get device count
            device_count = ctypes.c_int()
            get_device_count = cuda_lib.cuDeviceGetCount
            get_device_count.argtypes = [ctypes.POINTER(ctypes.c_int)]
            get_device_count.restype = ctypes.c_int
            
            count_result = get_device_count(ctypes.byref(device_count))
            print(f"   cuDeviceGetCount result: {count_result}, count: {device_count.value}")
        
    except OSError as e:
        print(f"   FAILED: Could not load libcuda.so.1 - {e}")
    except Exception as e:
        print(f"   FAILED: CUDA initialization error - {e}")
        
except ImportError:
    print("   ctypes not available")

print("\n=== End Diagnostics ===")
