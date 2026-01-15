# Copilot Instructions for LX-Annotate

## Project Overview

LX-Annotate is a Vue 3 + Django medical video annotation platform with AI-powered analysis. It's a proxy API frontend that delegates backend operations to the `endoreg-db` submodule, designed for clinical endoscopy annotation and AI training data generation.

## Key Architecture Patterns

### 1. Modular Workspace Structure
- **Root Django App**: `lx_annotate/` - Proxy API and static file serving
- **Backend Logic**: `libs/endoreg-db/` - Core models, views, and business logic (git submodule)
- **Anonymization**: `libs/lx-anonymizer/` - Video anonymization and AI processing (git submodule)
- **Frontend**: `frontend/` - Vue 3 SPA with TypeScript and Vuetify

### 2. API Proxy Architecture
Django acts as a **proxy API** - all `/api/*` requests are routed to `endoreg-db`:
```python
# lx_annotate/urls.py
path("api/", include(("endoreg_db.urls", "endoreg_db"), namespace="endoreg_db"))
```
**Critical**: Implement new API endpoints in `libs/endoreg-db/endoreg_db/views/`, not in the root Django app.

### 3. Environment Management with Nix/DevEnv
Development environment is managed through `devenv.nix` with automatic dependency resolution:
- Use `direnv allow` for initial setup
- Use `uv sync` for Python dependencies (handled automatically)
- Frontend builds automatically to Django's `static/` folder

## Essential Development Workflows

### DevEnv Setup and Management
The project uses **Nix/DevEnv** for reproducible development environments with unified management commands:

#### Initial Setup
```bash
# One-time setup (handles everything automatically)
direnv allow                    # Root environment
cd frontend && direnv allow     # Frontend has separate devenv.nix

# Automatic processes on shell enter:
# - Git submodule initialization
# - UV sync for Python dependencies  
# - Virtual environment activation
# - Environment variable loading from .env
```

#### Unified Management Commands
```bash
# Environment management
manage setup                    # Complete environment setup
manage dev                      # Switch to development mode
manage prod                     # Switch to production mode
manage status                   # Show current configuration

# Container operations (Docker/Podman)
manage docker-dev-build         # Build dev image
manage docker-dev-run           # Run dev container
manage docker-prod-build        # Build production image
manage docker-prod-run          # Run production container
manage docker-logs [tier]       # Tail logs (dev|prod)
manage docker-stop              # Stop containers
manage docker-clean             # Remove images and containers

# Deployment pipeline
manage deploy                   # Run migrations, load base data, collect static
```

#### Database Initialization (Required for First Run)
```bash
python manage.py migrate
python manage.py load_base_db_data
python manage.py create_multilabel_model_meta --model_path "./libs/endoreg-db/tests/assets/colo_segmentation_RegNetX800MF_6.ckpt"
```

#### Running Services
```bash
# Development mode
devenv up django                # Start Django process
# OR unified approach:
manage dev && devenv up

# Production mode
manage prod && devenv up
```

### Testing
- Use `pytest` with Django settings: `DJANGO_SETTINGS_MODULE = lx_annotate.settings_dev`
- Test files in `tests/` and `libs/endoreg-db/tests/`
- Video/AI tests marked with `@pytest.mark.video` and `@pytest.mark.ai`

### File Import Workflow
Files are imported by placing them in:
- `data/raw_videos/` - for video processing
- `data/raw_pdfs/` - for PDF OCR and metadata extraction

## Project-Specific Conventions

### 1. API Endpoint Patterns
Modern endpoints follow **media framework** patterns:
```
POST /api/media/videos/{pk}/reimport/     # NOT /api/video/{id}/
GET  /api/media/videos/{pk}/sensitive-metadata/
POST /api/media/pdfs/{pk}/reimport/
```

### 2. Async Task Architecture
Long-running operations use **Celery** for background processing:
```python
# Pattern: Return task_id immediately, poll for status
task = apply_mask_task.delay(video_id, config)
return Response({'task_id': task.id, 'status': 'pending'})

# Frontend polls: GET /api/task-status/{task_id}/
```

### 3. Vue 3 + Composition API Patterns
Components use `<script setup>` syntax with Pinia stores:
```typescript
// Store pattern
const anonymizationStore = useAnonymizationStore()
await anonymizationStore.reimportVideo(videoId)

// Composables in src/composables/
const { generatePseudonym } = usePseudonym()
```

### 4. Settings Management
- **Development**: `lx_annotate.settings_dev` (default via `manage.py`)
- **Production**: `lx_annotate.settings_prod`
- Environment detection via `DJANGO_ENV` variable
- Configuration centralized in `app_config.nix`

## Critical Integration Points

### 1. Frontend ↔ Django
- Vue app compiles to `lx_annotate/static/`
- Django serves SPA via catch-all route: `re_path(r"^(?!api/|admin/|media/).*$", ...)`
- API calls go to `/api/*` (proxied to endoreg-db)

### 2. Django ↔ endoreg-db
- All business logic lives in `libs/endoreg-db/`
- Models: `endoreg_db.models.*`
- Views: `endoreg_db.views.*` (media, patient, video, etc.)
- URL routing in `endoreg_db.urls.*`

### 3. AI/Video Processing
- Video anonymization via `lx-anonymizer` 
- CUDA support configured in `devenv.nix`
- Frame-by-frame processing with progress tracking
- Metadata extraction and sensitive data detection

## Common Gotchas

1. **Don't add views to root Django app** - use `libs/endoreg-db/endoreg_db/views/`
2. **Frontend changes require rebuild** - `npm run build` or restart devenv
3. **Database changes need migration** - in `libs/endoreg-db/`, not root
4. **Environment isolation** - frontend and backend have separate `devenv.nix` files
5. **Submodule updates** - changes in `libs/` directories affect git submodules

## Deployment and Infrastructure

### Kubernetes Setup
Production deployment uses Kubernetes with the following components:

#### Core Manifests (`k8s/`)
- **`deployment.tmpl.yaml`** - Main application deployment with health checks
- **`service.yaml`** - ClusterIP service exposing port 80 → 8118
- **`ingress.tmpl.yaml`** - Nginx ingress with Let's Encrypt TLS
- **`namespace.yaml`** - Dedicated `lx-annotate` namespace
- **`pvc.yaml`** - Persistent volume claims for data storage

#### Deployment Configuration
```yaml
# Key settings in deployment.tmpl.yaml
ports:
  - containerPort: 8118         # Django app port
env:
  - DJANGO_SETTINGS_MODULE: config.settings.prod
readinessProbe:
  path: /                       # Health check endpoint
securityContext:
  fsGroup: 10001               # File system permissions
```

#### Ingress and TLS
- **Ingress Class**: nginx
- **TLS**: Automated via cert-manager/Let's Encrypt
- **Host**: Template variable `${HOST}` for environment-specific domains

#### Container Strategy
- **Development**: `container/Dockerfile.dev` with development extras
- **Production**: `container/Dockerfile.prod` (optimized, no dev deps)
- **Base**: Python 3.12-slim with UV package manager
- **Dependencies**: Copied from `libs/` workspace for UV sources

### Environment Management
- **Settings**: Environment-aware via `DJANGO_ENV` variable
- **Configuration**: Centralized in `app_config.nix`
- **Secrets**: Kubernetes secrets and configmaps
- **Storage**: Persistent volumes for video/PDF data

## Key Files for Understanding
- `lx_annotate/urls.py` - API proxy routing
- `frontend/src/router/index.ts` - SPA routing
- `devenv/management.nix` - Unified development commands
- `libs/endoreg-db/endoreg_db/views/media/` - Modern API endpoints
- `frontend/src/stores/anonymizationStore.ts` - Core application state
- `k8s/deployment.tmpl.yaml` - Production Kubernetes deployment
- `devenv.nix` - Development environment configuration
- `app_config.nix` - Centralized application configuration