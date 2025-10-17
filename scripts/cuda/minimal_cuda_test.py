#!/usr/bin/env python3
"""
Minimal PyTorch CUDA test
"""
import os
print("Environment - CUDA_VISIBLE_DEVICES:", os.environ.get('CUDA_VISIBLE_DEVICES', 'NOT SET'))
print("Environment - NVIDIA_VISIBLE_DEVICES:", os.environ.get('NVIDIA_VISIBLE_DEVICES', 'NOT SET'))

print("\nImporting torch...")
import torch

print("PyTorch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("Device count:", torch.cuda.device_count())
    print("Current device:", torch.cuda.current_device())
    print("Device name:", torch.cuda.get_device_name(0))
    
    # Try to allocate some memory to test if GPU is actually usable
    try:
        x = torch.randn(10, 10).cuda()
        print("✓ Successfully allocated tensor on GPU")
        print("Device of tensor:", x.device)
    except Exception as e:
        print(f"✗ Failed to allocate tensor on GPU: {e}")
else:
    print("CUDA not available")
