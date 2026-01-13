# Container Infrastructure

This directory contains all container-related files for the Ls Annotate project, providing a clean separation of container infrastructure from application code.

## Container Files

### Dockerfiles
- **`Dockerfile.dev`** - Development container with DevEnv integration
- **`Dockerfile.prod`** - Production container with optimized multi-stage builds

### Entrypoint Scripts
- **`docker-entrypoint.sh`** - Development container entrypoint
- **`docker-entrypoint-prod.sh`** - Production container entrypoint

## Container Architecture

### Development Container (`Dockerfile.dev`)
**Purpose**: Fast development environment with full DevEnv integration

**Features**:
- ✅ Multi-stage caching for DevEnv environment
- ✅ FFmpeg, OpenCV, CUDA dependencies pre-cached
- ✅ Fast startup (no DevEnv rebuild on container start)
- ✅ Full development toolchain available
- ✅ Hot reload and debugging support

**Usage**:
```bash
# Build development container
docker build -f container/Dockerfile.dev -t lx-annotate-dev .

# Run development container
docker run -p 8118:8118 -v $(pwd)/data:/app/data lx-annotate-dev
```

### Production Container (`Dockerfile.prod`)
**Purpose**: Optimized production deployment with security and performance focus

**Features**:
- ✅ Multi-stage build optimization
- ✅ Static files pre-built in container
- ✅ Minimal runtime footprint
- ✅ Production security settings
- ✅ Health checks and migration automation

**Usage**:
```bash
# Build production container
docker build -f container/Dockerfile.prod -t lx-annotate-prod .

# Run production container
docker run -p 8118:8118 \
  -e DJANGO_SECRET_KEY="your-secret-key" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/conf:/app/conf \
  lx-annotate-prod
```

## DevEnv Integration

Both containers use **DevEnv native integration** for:

- **Dependency Management**: All system dependencies managed through Nix/DevEnv
- **Environment Consistency**: Same environment in containers and development shells
- **Caching Optimization**: DevEnv environment pre-built and cached in container layers
- **GPU Support**: CUDA acceleration available when Docker GPU runtime is configured

## Container Management

### Using Unified Management System (Recommended)
```bash
# Development
manage dev && manage build && manage run

# Production  
manage prod && manage build && manage run
```

### Direct Docker Commands
```bash
# Development
docker build -f container/Dockerfile.dev -t lx-annotate-dev .
docker run --rm -p 8118:8118 lx-annotate-dev

# Production
docker build -f container/Dockerfile.prod -t lx-annotate-prod .
docker run --rm -p 8118:8118 \
  -e DJANGO_SECRET_KEY="secret" \
  lx-annotate-prod
```

### Legacy Testing
```bash
# Test container builds
./tests/legacy/test-containers.sh

# Test container functionality
./tests/legacy/test-container-functionality.sh
```

## Environment Variables

Both containers now mirror the `.env.example` template used by the core application. Key defaults:

- `DJANGO_SETTINGS_MODULE` – defaults to `config.settings_dev` (dev) or `config.settings.prod` (prod)
- `DJANGO_ENV` – `development`, `production`, or `central`
- `TIME_ZONE` – default `Europe/Berlin`
- `STORAGE_DIR` / `DATA_DIR` – default `/app/data`
- `STATIC_URL` / `MEDIA_URL` – default `/static/` and `/media/`

Additional notes:

- `CENTRAL_NODE=true` automatically selects `config.settings.central`
- Production entrypoint enforces `DJANGO_DEBUG=false` and requires `DJANGO_SECRET_KEY`
- Database configuration via `DATABASE_URL` or `DB_*` variables (same precedence as `.env`)

## Volume Mounts

### Required Volumes
- `/app/data` - Application data (videos, frames, exports)
- `/app/conf` - Configuration files (database credentials)

### Optional Volumes
- `/app/staticfiles` - Static files (auto-generated if not mounted)
- `/app/logs` - Application logs

## GPU Support

Both containers support NVIDIA GPU acceleration when:

1. **Host GPU Available**: NVIDIA GPU with drivers installed
2. **Docker GPU Runtime**: Docker configured with NVIDIA container runtime
3. **Container Runtime**: Add `--gpus all` flag to docker run

```bash
# GPU-enabled container
docker run --gpus all -p 8117:8117 lx-annotate-dev
```

## Build Optimization

### Development Container
- **Layer Caching**: DevEnv environment cached separately from application code
- **Fast Rebuilds**: Application changes don't trigger DevEnv rebuild
- **Incremental Updates**: Only changed layers rebuilt

### Production Container
- **Multi-Stage**: Build artifacts and runtime separated
- **Static Pre-Build**: Static files generated during build, not runtime
- **Minimal Runtime**: Only essential components in final image
- **Security Hardening**: Production security settings applied

## Troubleshooting

### Build Issues
```bash
# Clear build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -f container/Dockerfile.dev -t lx-annotate-dev .
```

### Runtime Issues
```bash
# Check container logs
docker logs <container-name>

# Interactive shell access
docker exec -it <container-name> devenv shell
```

### GPU Issues
```bash
# Test GPU in container
docker run --gpus all --rm lx-annotate-dev devenv shell -- python -c "import torch; print(torch.cuda.is_available())"
```

---

## Related Documentation

- **[DevEnv Containers Guide](../docs/NATIVE_DEVENV_CONTAINERS_GUIDE.md)** - Detailed container usage guide
- **[Centralized Configuration](../docs/CENTRALIZED_CONFIG_GUIDE.md)** - Configuration management
- **[Main README](../README.md)** - Complete project documentation

**📚 [Complete Documentation Index](../docs/README.md)**
