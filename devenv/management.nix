# Centralized Management for Lx Annotate DevEnv
# =====================================
# 
# This file consolidates all management tasks, scripts, and container operations
# into a unified DevEnv-based approach using the centralized configuration.

{ pkgs, lib, appConfig, isDev ? false }:
let
  # Utility functions (legacy placeholders; kept for future use)
  containerName = mode: "${appConfig.app.name}-${mode}-test";
  commonContainerArgs = mode: [ ];
  gpuArgs = ''
    : # GPU args placeholder
  '';
in
{
  # =============================================================================
  # UNIFIED TASK DEFINITIONS
  # =============================================================================
  
  tasks = {
    # Environment Management
    "env:setup" = {
      description = "Complete environment setup (replaces multiple scripts)";
      exec = ''
        echo "🔧 Setting up Lx Annotate environment..."
        
        # Step 1: Ensure directories
        export WORKING_DIR="''${WORKING_DIR:-$(pwd)}"
        mkdir -p ${appConfig.paths.data} ${appConfig.paths.conf} staticfiles
        mkdir -p ${appConfig.paths.data}/{import,export,videos,frames,pdfs,model_weights,logs}
        
        # Step 2: Configuration setup (use existing scripts)
        ${pkgs.uv}/bin/uv run python scripts/database/make_conf.py
        
        # Step 3: Environment file setup
        ${pkgs.uv}/bin/uv run python scripts/core/setup.py
        
        # Step 4: CUDA environment setup (optional)
        devenv tasks run env:setup-cuda || true
        
        echo "✅ Environment setup complete!"
      '';
    };

    # CUDA setup (non-fatal)
    "env:setup-cuda" = {
      description = "Setup CUDA environment for PyTorch";
      exec = ''
        echo "🧪 Checking CUDA environment..."
        ${pkgs.uv}/bin/uv run python scripts/cuda/test_cuda_paths.py || true
        ${pkgs.uv}/bin/uv run python scripts/cuda/minimal_cuda_test.py || true
        echo "⚠️  CUDA setup finished (non-blocking)"
      '';
    };

    # Deployment pipeline
    "deploy:full" = {
      description = "Run migrations, load base data, and collect static files";
      exec = ''
        set -e
        ${pkgs.uv}/bin/uv run python manage.py migrate
        ${pkgs.uv}/bin/uv run python manage.py load_base_db_data || true
        ${pkgs.uv}/bin/uv run python manage.py collectstatic --noinput
        echo "✅ Deploy pipeline complete"
      '';
    };
  };

  # =============================================================================
  # UNIFIED SCRIPT DEFINITIONS
  # =============================================================================

  scripts = {
    "manage".exec = ''
      subcmd="''${1:-help}"
      case "$subcmd" in
        "setup")
          echo "🔧 Setting up Lx Annotate..."
          devenv tasks run env:setup
          ;;
        "dev")
          echo "development" > .mode
          echo "🔄 Switched to development mode"
          devenv tasks run env:setup
          ;;
        "prod") 
          echo "production" > .mode
          echo "🔄 Switched to production mode"
          devenv tasks run env:setup
          ;;
        "deploy")
          devenv tasks run deploy:full
          ;;
        docker-*)
          shift
          "$subcmd" "$@"
          ;;
        "status")
          echo "Current Configuration:"
          echo "====================="
          echo "Env: $(cat .mode 2>/dev/null || echo 'development')"
          echo "App: ${appConfig.app.name}"
          echo "Port: ${appConfig.server.port}"
          echo "Host: ${appConfig.server.host}"
          ;;
        "help"|*)
          echo "Lx Annotate Management Commands"
          echo "============================"
          echo ""
          echo "Environment:"
          echo "  manage setup              - Complete environment setup"
          echo "  manage dev                - Switch to development mode"
          echo "  manage prod               - Switch to production mode"
          echo ""
          echo "Containers (Docker/Podman):"
          echo "  manage docker-dev-build   - Build dev image"
          echo "  manage docker-dev-run     - Run dev container"
          echo "  manage docker-prod-build  - Build prod image"
          echo "  manage docker-prod-run    - Run prod container"
          echo "  manage docker-logs [tier] - Tail logs (tier: dev|prod)"
          echo "  manage docker-stop        - Stop containers"
          echo "  manage docker-clean       - Remove images and containers"
          echo ""
          echo "Deployment:"
          echo "  manage deploy             - Run full deployment pipeline"
          echo ""
          echo "Examples:"
          echo "  manage dev && devenv up"
          echo "  manage docker-dev-build && manage docker-dev-run"
          ;;
      esac
    '';
    

    "run-server".exec = ''
      export DJANGO_HOST="''${DJANGO_HOST:-${appConfig.server.host}}"
      export DJANGO_PORT="''${DJANGO_PORT:-${appConfig.server.port}}"
      bash scripts/core/server-run.sh
    '';

    "docker-dev-build".exec = ''
      set -e
      RUNTIME=""
      if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi
      $RUNTIME build -f container/Dockerfile.dev -t lx-annotate:dev .
    '';

    "docker-dev-run".exec = ''
      set -e
      RUNTIME=""
      if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi
      $RUNTIME rm -f lx-annotate-dev >/dev/null 2>&1 || true
      $RUNTIME run -d --name lx-annotate-dev \
        -p ${appConfig.server.port}:${appConfig.server.port} \
        -e DJANGO_ENV=development \
        -e DJANGO_HOST=0.0.0.0 \
        -e DJANGO_PORT=${appConfig.server.port} \
        -e DJANGO_MODULE=${appConfig.app.djangoModule} \
        -v $(pwd)/${appConfig.paths.data}:/app/${appConfig.paths.data} \
        -v $(pwd)/${appConfig.paths.conf}:/app/${appConfig.paths.conf} \
        -v $(pwd)/staticfiles:/app/staticfiles \
        lx-annotate:dev
    '';

    "docker-prod-build".exec = ''
      set -e
      RUNTIME=""
      if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi
      $RUNTIME build -f container/Dockerfile.prod -t lx-annotate:prod .
    '';

    "docker-prod-run".exec = ''
      set -e
      RUNTIME=""
      if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi

      if [ -z "''${DJANGO_SECRET_KEY:-}" ]; then echo "DJANGO_SECRET_KEY must be set"; exit 1; fi

      if [ -z "''${DATABASE_URL:-}" ] \
         && [ -z "''${DB_NAME:-}" ] && [ -z "''${DB_USER:-}" ] && [ -z "''${DB_PASSWORD:-}" ] \
         && [ -z "''${DB_HOST:-}" ] && [ -z "''${DB_PORT:-}" ]; then
        echo "Provide DATABASE_URL or DB_* env vars before running."; exit 1
      fi

      $RUNTIME rm -f lx-annotate-prod >/dev/null 2>&1 || true
      $RUNTIME run -d --name lx-annotate-prod \
        -p ${appConfig.server.port}:${appConfig.server.port} \
        -e DJANGO_ENV=production \
        -e DJANGO_HOST=0.0.0.0 \
        -e DJANGO_PORT=${appConfig.server.port} \
        -e DJANGO_MODULE=${appConfig.app.djangoModule} \
        -e DJANGO_SECRET_KEY="$DJANGO_SECRET_KEY" \
        -e DJANGO_ALLOWED_HOSTS \
        -e DJANGO_DEBUG \
        -e DJANGO_SECURE_SSL_REDIRECT \
        -e DJANGO_SESSION_COOKIE_SECURE \
        -e DJANGO_CSRF_COOKIE_SECURE \
        -e DATABASE_URL \
        -e DB_ENGINE \
        -e DB_NAME \
        -e DB_USER \
        -e DB_PASSWORD \
        -e DB_HOST \
        -e DB_PORT \
        -v $(pwd)/${appConfig.paths.data}:/app/${appConfig.paths.data} \
        -v $(pwd)/staticfiles:/app/staticfiles \
        lx-annotate:prod
    '';

    "docker-logs".exec = ''
      RUNTIME=""; if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi
      tier="''${1:-dev}"; name="lx-annotate-$tier"; $RUNTIME logs -f "$name"
    '';

    "docker-stop".exec = ''
      RUNTIME=""; if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi
      for tier in dev prod; do $RUNTIME rm -f lx-annotate-$tier >/dev/null 2>&1 || true; done
    '';

    "docker-clean".exec = ''
      RUNTIME=""; if command -v podman >/dev/null 2>&1; then RUNTIME=podman; elif command -v docker >/dev/null 2>&1; then RUNTIME=docker; else echo "No container engine"; exit 1; fi
      for img in lx-annotate:dev lx-annotate:prod; do $RUNTIME rmi "$img" >/dev/null 2>&1 || true; done
    '';
  };
}
