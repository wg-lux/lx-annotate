# CUDA Diagnostic Scripts

This directory contains CUDA diagnostic and troubleshooting scripts for GPU support in the Lx Annotate project.

## Available Scripts

### `test_cuda_detailed.py`
**Detailed CUDA diagnostics** - Comprehensive CUDA environment analysis
- **Purpose**: Deep diagnostics for CUDA setup issues
- **Usage**: `python scripts/cuda/test_cuda_detailed.py`
- **Output**: Detailed environment variables, PyTorch info, library paths, and error diagnostics

### `test_cuda_paths.py`  
**CUDA paths testing** - Library path resolution diagnostics
- **Purpose**: Help PyTorch find CUDA libraries by testing path configurations
- **Usage**: `python scripts/cuda/test_cuda_paths.py`
- **Output**: Package locations, library search paths, and configuration suggestions

### `debug_cuda_pytorch.py`
**PyTorch CUDA debugging** - Debug PyTorch-specific CUDA issues
- **Purpose**: Debug PyTorch CUDA initialization problems
- **Usage**: `python scripts/cuda/debug_cuda_pytorch.py`
- **Output**: PyTorch-specific CUDA diagnostics and troubleshooting info

### `minimal_cuda_test.py`
**Minimal CUDA test** - Simple CUDA availability test
- **Purpose**: Quick test to verify basic CUDA functionality
- **Usage**: `python scripts/cuda/minimal_cuda_test.py`
- **Output**: Basic CUDA availability and device information

## Quick CUDA Check

For quick CUDA verification, use the main GPU check script:

```bash
# Quick check (integrated into DevEnv)
gpu-check

# Or directly
python scripts/gpu-check.py
```

## When to Use These Scripts

1. **CUDA Not Detected**: When `torch.cuda.is_available()` returns `False` despite GPU being present
2. **Library Path Issues**: When CUDA libraries aren't being found by PyTorch
3. **Environment Debugging**: When setting up CUDA in containers or new environments
4. **Performance Issues**: When investigating GPU memory or performance problems

## Common Issues & Solutions

### PyTorch Can't Find CUDA
```bash
# Run detailed diagnostics
python scripts/cuda/test_cuda_detailed.py

# Check if libraries are in the expected locations
python scripts/cuda/test_cuda_paths.py
```

### Container CUDA Issues
```bash
# Check CUDA runtime in container
docker exec -it <container> python scripts/cuda/test_cuda_detailed.py
```

### Environment Variable Issues
The detailed script will show if `CUDA_HOME`, `LD_LIBRARY_PATH`, or other CUDA variables are properly set.

---

**Note**: These scripts are diagnostic tools. For normal CUDA functionality, the main `gpu-check` script and DevEnv CUDA configuration should be sufficient.
