````markdown
# CUDA Diagnostic Scripts 🚀

Comprehensive CUDA diagnostic and troubleshooting suite for GPU support in the Lx Annotate project.

## Script Overview

| Script | Purpose | Complexity | Use Case |
|--------|---------|------------|----------|
| `minimal_cuda_test.py` | Quick CUDA availability check | ⭐ Basic | First diagnostic step |
| `debug_cuda_pytorch.py` | PyTorch-specific CUDA debugging | ⭐⭐ Intermediate | PyTorch integration issues |
| `test_cuda_paths.py` | Library path resolution | ⭐⭐⭐ Advanced | Path/library issues |
| `test_cuda_detailed.py` | Comprehensive environment analysis | ⭐⭐⭐⭐ Expert | Complete diagnostics |

## Detailed Script Documentation

### 🟢 `minimal_cuda_test.py` - **Quick Verification**
**Purpose**: Minimal CUDA functionality test - your first diagnostic step

```bash
python scripts/cuda/minimal_cuda_test.py
```

**What it checks**:
- Basic CUDA availability (`torch.cuda.is_available()`)
- GPU device count and names
- Memory information
- PyTorch CUDA version

**When to use**: 
- First check when CUDA issues suspected
- Quick verification in new environments
- CI/CD pipeline health checks

**Example output**:
```
✅ CUDA Available: True
✅ Devices Found: 1
✅ Device 0: NVIDIA GeForce RTX 3070 Laptop GPU
✅ Total Memory: 7841.06 MB
```

### 🟡 `debug_cuda_pytorch.py` - **PyTorch Troubleshooting**
**Purpose**: Debug PyTorch-specific CUDA initialization and integration issues

```bash
python scripts/cuda/debug_cuda_pytorch.py
```

**What it checks**:
- PyTorch CUDA compilation details
- CUDNN availability and version
- Tensor operations on GPU
- Memory allocation testing
- PyTorch version compatibility

**When to use**:
- PyTorch can't find CUDA despite system detection
- GPU memory allocation errors
- PyTorch-specific performance issues
- Version compatibility problems

**Example issues it resolves**:
- "CUDA driver version is insufficient for CUDA runtime version"
- "No CUDA GPUs are available" (PyTorch-specific)
- PyTorch tensor operations failing on GPU

### 🟠 `test_cuda_paths.py` - **Library Path Resolution**
**Purpose**: Diagnose and resolve CUDA library path and configuration issues

```bash
python scripts/cuda/test_cuda_paths.py
```

**What it checks**:
- CUDA installation paths (`/usr/local/cuda`, `/opt/cuda`)
- Environment variables (`CUDA_HOME`, `LD_LIBRARY_PATH`)
- PyTorch package CUDA libraries
- System-wide vs. conda CUDA installations
- Library version mismatches

**When to use**:
- "CUDA driver version insufficient" errors
- PyTorch can't load CUDA libraries
- Multiple CUDA versions conflict
- Container/Docker CUDA setup issues

**Advanced features**:
- Suggests `LD_LIBRARY_PATH` corrections
- Identifies CUDA version mismatches
- Package location analysis

### 🔴 `test_cuda_detailed.py` - **Comprehensive Analysis**
**Purpose**: Expert-level comprehensive CUDA environment diagnostics

```bash
python scripts/cuda/test_cuda_detailed.py
```

**What it checks**:
- Complete environment variable dump
- All CUDA-related system paths
- Driver and runtime version analysis
- GPU hardware capabilities
- Memory and compute capability details
- Complete PyTorch configuration
- System CUDA vs. PyTorch CUDA comparison

**When to use**:
- Complex multi-GPU setup issues
- Performance optimization analysis
- Complete environment validation
- Bug reports requiring full diagnostics

**Expert analysis includes**:
- Compute capability matrices
- Multi-GPU topology
- Memory bandwidth analysis
- CUDA toolkit vs. driver compatibility

## Diagnostic Workflow 📋

### 🚀 Quick Start Workflow
```bash
# 1. First check - is CUDA basically working?
python scripts/cuda/minimal_cuda_test.py

# 2. If issues found, run PyTorch diagnostics
python scripts/cuda/debug_cuda_pytorch.py

# 3. For path/library issues, check paths
python scripts/cuda/test_cuda_paths.py

# 4. For complex issues, full diagnostics
python scripts/cuda/test_cuda_detailed.py
```

### 🔧 Common Issue Resolution

#### Issue: "CUDA not available" despite GPU present
```bash
# Step 1: Basic check
python scripts/cuda/minimal_cuda_test.py

# Step 2: If PyTorch issue, debug PyTorch specifically
python scripts/cuda/debug_cuda_pytorch.py

# Step 3: Check if library path issue
python scripts/cuda/test_cuda_paths.py
```

#### Issue: GPU memory errors or performance problems
```bash
# Deep GPU analysis
python scripts/cuda/test_cuda_detailed.py

# Focus on PyTorch GPU operations
python scripts/cuda/debug_cuda_pytorch.py
```

#### Issue: Container/Docker CUDA setup
```bash
# In container, run full diagnostics
docker exec -it container python scripts/cuda/test_cuda_detailed.py

# Check path configuration specifically
docker exec -it container python scripts/cuda/test_cuda_paths.py
```

## Integration with Main GPU Check

For routine verification, use the main GPU diagnostic:

```bash
# Quick integrated check (part of DevEnv)
python scripts/utilities/gpu-check.py

# Or via DevEnv command
gpu-check
```

**When to escalate to CUDA scripts**:
- Main GPU check shows issues
- Development environment CUDA problems
- Performance optimization needed
- Bug reporting requires detailed diagnostics

## Environment Variables Reference

These scripts will analyze and suggest fixes for:

```bash
# Essential CUDA environment variables
export CUDA_HOME="/usr/local/cuda"
export PATH="${CUDA_HOME}/bin:${PATH}"
export LD_LIBRARY_PATH="${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}"

# PyTorch specific (sometimes needed)
export TORCH_CUDA_ARCH_LIST="6.0 6.1 7.0 7.5 8.0 8.6"
export CUDA_VISIBLE_DEVICES="0"  # or "0,1" for multi-GPU
```

## Performance Optimization

### Memory Optimization
```bash
# Check memory configuration
python scripts/cuda/test_cuda_detailed.py | grep -i memory

# Test memory allocation patterns
python scripts/cuda/debug_cuda_pytorch.py
```

### Multi-GPU Configuration
```bash
# Analyze multi-GPU topology
python scripts/cuda/test_cuda_detailed.py

# Check inter-GPU communication
python scripts/cuda/debug_cuda_pytorch.py
```

## Troubleshooting by Error Message

### "CUDA driver version is insufficient"
```bash
# Check version compatibility
python scripts/cuda/test_cuda_paths.py
python scripts/cuda/test_cuda_detailed.py
```

### "No CUDA GPUs are available"
```bash
# PyTorch-specific check
python scripts/cuda/debug_cuda_pytorch.py

# Complete path analysis
python scripts/cuda/test_cuda_paths.py
```

### "Out of memory" errors
```bash
# Memory analysis and optimization
python scripts/cuda/test_cuda_detailed.py
python scripts/cuda/debug_cuda_pytorch.py
```

## Integration with DevEnv & CI/CD

### DevEnv Integration
```nix
# devenv/scripts.nix
cudaDiagnostics = {
  minimal = "python scripts/cuda/minimal_cuda_test.py";
  pytorch = "python scripts/cuda/debug_cuda_pytorch.py";
  paths = "python scripts/cuda/test_cuda_paths.py";
  detailed = "python scripts/cuda/test_cuda_detailed.py";
};
```

### CI/CD Health Checks
```yaml
# Example GitHub Actions integration
- name: CUDA Health Check
  run: python scripts/cuda/minimal_cuda_test.py
  
- name: Full CUDA Diagnostics (on failure)
  if: failure()
  run: python scripts/cuda/test_cuda_detailed.py
```

---

## Support & Contribution

### Bug Reports
When reporting CUDA-related issues, please include:
1. Output from `python scripts/cuda/test_cuda_detailed.py`
2. System information (OS, driver versions, hardware)
3. Specific error messages and reproduction steps

### Contributing
- Add new diagnostic scripts for specific CUDA issues
- Improve error detection and suggestions
- Add support for new GPU architectures
- Enhance multi-GPU diagnostics

---

*These CUDA diagnostic scripts provide professional-grade troubleshooting capabilities for complex GPU computing environments. Use them as your comprehensive toolkit for CUDA development and deployment.*

````
