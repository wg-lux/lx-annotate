#!/usr/bin/env python3
"""
Test if we can help PyTorch find CUDA by setting up the environment properly
"""
import os

print("=== CUDA Runtime Library Test ===\n")

# Find where Python CUDA packages install their libraries
try:
    import nvidia.cuda_runtime
    cuda_runtime_path = os.path.dirname(nvidia.cuda_runtime.__file__)
    print(f"nvidia-cuda-runtime path: {cuda_runtime_path}")
    
    # Look for shared libraries
    lib_path = os.path.join(cuda_runtime_path, 'lib')
    if os.path.exists(lib_path):
        libs = [f for f in os.listdir(lib_path) if f.endswith('.so')]
        print(f"Libraries found: {libs[:5]}")  # First 5
    else:
        print("No lib directory found in cuda_runtime package")
        
except ImportError:
    print("nvidia.cuda_runtime not importable")

# Try to find where PyTorch expects CUDA libraries
print("\n=== PyTorch CUDA Library Expectations ===")
import torch.utils.cpp_extension
try:
    cuda_home = torch.utils.cpp_extension.CUDA_HOME
    print(f"PyTorch CUDA_HOME: {cuda_home}")
except:
    print("Could not determine PyTorch CUDA_HOME")

# Check what happens if we set CUDA_HOME to the nvidia package location
print("\n=== Testing with nvidia package CUDA_HOME ===")
try:
    import nvidia
    nvidia_path = os.path.dirname(nvidia.__file__)
    print(f"nvidia package path: {nvidia_path}")
    
    # Look for potential CUDA home in nvidia packages
    potential_cuda_home = os.path.join(nvidia_path, 'cuda_runtime')
    if os.path.exists(potential_cuda_home):
        print(f"Found cuda_runtime in nvidia packages: {potential_cuda_home}")
        lib_dir = os.path.join(potential_cuda_home, 'lib')
        if os.path.exists(lib_dir):
            print(f"lib directory exists: {lib_dir}")
            libs = os.listdir(lib_dir)
            print(f"CUDA libraries: {[l for l in libs if 'cuda' in l.lower()][:3]}")
except Exception as e:
    print(f"Error exploring nvidia packages: {e}")

print("\n=== Done ===")
