{ config, pkgs, lib, 
  appName, port, deploymentMode,
  bind,
... }@inputs: 
let

  djangoScripts = {
    run-dev-server = {
      exec =''
        ${pkgs.uv}/bin/uv run python manage.py runserver ${bind}:${toString port}
      '';
    };
    run-prod-server = {
      exec = '' 
        ${pkgs.uv}/bin/uv run daphne ${appName}.asgi:application \
        --port=${toString port} --proxy-headers \
        # --bind ${bind} --verbosity=2 \
        # --access-log logs/daphne-access.log
      '';
    };
    # Add convenience script to start both Django and file watcher
    run-dev-with-watcher = {
      exec = ''
        echo "🚀 Starting Django development server with file watcher..."
        
        # Start file watcher in background
        ${pkgs.uv}/bin/uv run python manage.py start_filewatcher --log-level INFO &
        FILEWATCHER_PID=$!
        echo "📁 File watcher started with PID: $FILEWATCHER_PID"
        
        # Function to cleanup on exit
        cleanup() {
          echo "🛑 Stopping file watcher..."
          kill $FILEWATCHER_PID 2>/dev/null || true
          echo "✅ Cleanup complete"
        }
        
        # Register cleanup function
        trap cleanup EXIT INT TERM
        
        # Start Django server
        echo "🌐 Starting Django server on ${bind}:${toString port}..."
        ${pkgs.uv}/bin/uv run python manage.py runserver ${bind}:${toString port}
      '';
    };
  };

in djangoScripts