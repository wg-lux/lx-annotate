{}@inputs:
let
  customTasks = {
  "uv:sync" = {
    description = "Run uv sync to synchronize Python packages";
    after       = [ "env:build" ];
    exec        = ''
          # Ensure dependencies are synced using uv
              # Check if venv exists. If not, run sync verbosely. If it exists, sync quietly.
              if [ ! -d ".devenv/state/venv" ]; then
                echo "Virtual environment not found. Running initial uv sync..."
                $SYNC_CMD || echo "Error: Initial uv sync failed. Please check network and pyproject.toml."
              else
                # Sync quietly if venv exists
                echo "Syncing Python dependencies with uv..."
                $SYNC_CMD || echo "Warning: uv sync failed. Environment might be outdated."
              fi

              # Activate Python virtual environment managed by uv
              ACTIVATED=false
              if [ -f ".devenv/state/venv/bin/activate" ]; then
                source .devenv/state/venv/bin/activate
                ACTIVATED=true
                echo "Virtual environment activated."
              else
                echo "Warning: uv virtual environment activation script not found. Please ensure uv sync was successful."
              fi
                  uv sync
                  '';
  };
};

in customTasks