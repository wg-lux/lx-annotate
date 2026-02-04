# Centralized Management for Lx Annotate DevEnv
# =====================================
# 
# This file consolidates all management tasks, scripts, and container operations
# into a unified DevEnv-based approach using the centralized configuration.

{ pkgs, lib, env, isDev ? false }:
let
  # Utility functions (legacy placeholders; kept for future use)
  containerName = mode: "${env.app.name}-${mode}-test";
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
        mkdir -p ${env.WORKING_DIR} staticfiles
        mkdir -p ${env.WORKING_DIR}/{import,export,videos,frames,pdfs,model_weights,logs}
        
        
        # Step 3: Environment file setup
        
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
    "vue:build".exec = 
      ''
      cd frontend
      direnv allow
      npm install
      npm run build
    '';

  };

  # =============================================================================
  # UNIFIED SCRIPT DEFINITIONS
  # =============================================================================

  scripts = {
    "manage".exec = ''
      REPO_ROOT="${env.WORKING_DIR}"
      cd "$REPO_ROOT"
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
          echo "App: ${env.DJANGO_HOST}"
          echo "Port: ${env.DJANGO_PORT}"
          echo "Host: ${env.DJANGO_HOST}"
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

    "vue-build".exec = ''
      REPO_ROOT="${env.WORKING_DIR}"
      cd "$REPO_ROOT"
      cd frontend
      npm install
      npm run build
    '';

    "export-frames".exec = ''
      REPO_ROOT="${env.WORKING_DIR}"
      cd "$REPO_ROOT"
      mkdir -p "${env.STORAGE_DIR}/export/frames/"
      secretspec run --profile env python manage.py export_frame_annot --output-path "${env.STORAGE_DIR}/export/frames/"
    '';
    

    "run-server".exec = ''
      REPO_ROOT="${env.WORKING_DIR}"
        cd "$REPO_ROOT"
        
        # Define the explicit path to the venv python
        VENV_PYTHON="$REPO_ROOT/.devenv/state/venv/bin/python"
        
        echo "🌀 Starting Daphne using Venv Python..."
        
        if [ -z "''${DJANGO_SETTINGS_MODULE:-}" ]; then
          export DJANGO_SETTINGS_MODULE="lx_annotate.settings"
        else
          case "$DJANGO_SETTINGS_MODULE" in
            config* )
              export DJANGO_SETTINGS_MODULE="lx_annotate.settings.settings_prod"
              ;;
          esac
        fi

        # Use the explicit Venv Python to run daphne as a module
        # This bypasses the broken 'uv run' shell logic
        secretspec run --provider env $VENV_PYTHON -m daphne \
          -b "${env.DJANGO_HOST}" \
          -p "${env.DJANGO_PORT}" \
          lx_annotate.asgi:application
    '';

    "run-filewatcher".exec = ''
            REPO_ROOT="${env.WORKING_DIR}"
        cd "$REPO_ROOT"
        
        # Define the explicit path to the venv python
        VENV_PYTHON="$REPO_ROOT/.devenv/state/venv/bin/python"
        
        echo "🌀 Starting Filewatcher using Venv Python..."
        
        if [ -z "''${DJANGO_SETTINGS_MODULE:-}" ]; then
          export DJANGO_SETTINGS_MODULE="lx_annotate.settings"
        else
          case "$DJANGO_SETTINGS_MODULE" in
            config* )
              export DJANGO_SETTINGS_MODULE="lx_annotate.settings.settings_prod"
              ;;
          esac
        fi

        # Use the explicit Venv Python to run daphne as a module
        # This bypasses the broken 'uv run' shell logic
        secretspec run --provider env $VENV_PYTHON -m scripts/file_watcher.py
    '';

  };
}
