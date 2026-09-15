# CUDA Diagnostic Scripts

CUDA diagnostics for LX-Annotate.

## Scripts

- `minimal_cuda_test.py`: quick CUDA availability check
- `debug_cuda_pytorch.py`: PyTorch CUDA diagnostics
- `test_cuda_paths.py`: CUDA library/path checks
- `test_cuda_detailed.py`: full diagnostic output

## Recommended Workflow

1. Run the quick check:

```bash
python scripts/cuda/minimal_cuda_test.py
```

2. If CUDA is unavailable in PyTorch:

```bash
python scripts/cuda/debug_cuda_pytorch.py
```

3. If you suspect library/path problems:

```bash
python scripts/cuda/test_cuda_paths.py
```

4. For full debugging context:

```bash
python scripts/cuda/test_cuda_detailed.py
```

## Common Environment Variables

```bash
export CUDA_HOME="/usr/local/cuda"
export PATH="${CUDA_HOME}/bin:${PATH}"
export LD_LIBRARY_PATH="${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}"
export CUDA_VISIBLE_DEVICES="0"
```

## Integration

For routine checks, you can also run:

```bash
python scripts/utilities/gpu-check.py
```
