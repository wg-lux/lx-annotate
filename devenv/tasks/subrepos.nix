{}@inputs:
let
  customTasks = {
  "setup:endoreg-db" = {
    description = "Run git clone for endoreg-db sub‑project";
    after       = [ "devenv:enterShell" ];
    exec        = ''
                    ENDOREG_DB_REPO="https://github.com/wg-lux/endoreg-db"
                    ENDOREG_DB_BRANCH="prototype"
                    if [ -d "$ENDOREG_DB_DIR" ]; then
                      echo "endoreg-db directory exists. Pulling latest changes from $ENDOREG_DB_BRANCH..."
                      if [ -f "$ENDOREG_DB_DIR/.git/index.lock" ]; then
                        echo "Warning: .git/index.lock exists in $ENDOREG_DB_DIR. Skipping git update to avoid conflicts."
                      elif pgrep -f "git.*$ENDOREG_DB_DIR" > /dev/null; then
                        echo "Warning: git process running in $ENDOREG_DB_DIR. Skipping git update."
                      else
                        sleep $((RANDOM % 3))
                        (cd "$ENDOREG_DB_DIR" && git fetch origin && git checkout "$ENDOREG_DB_BRANCH" && git reset --hard "origin/$ENDOREG_DB_BRANCH")
                      fi
                    else
                      echo "endoreg-db directory does not exist. Cloning repository..."
                      git clone -b "$ENDOREG_DB_BRANCH" "$ENDOREG_DB_REPO" "$ENDOREG_DB_DIR"
                    fi
                      '';
    status      = ''
                    ENDOREG_DB_DIR="endoreg-db"
                    if [ -f ./$ENDOREG_DB_DIR ]; then
                      echo "endoreg-db installed"
                      exit 1
                    else
                      echo "running endoreg-db setup"
                      exit 0
                    fi
                  '';
  };

  "setup:lx-anonymizer" = {
    description = "Run git clone for lx-anonymizer sub‑project";
    after       = [ "devenv:enterShell" ];
    exec        = ''
                    # check if the directory exists and is empty
                    if [ -d "$LX_ANONYMIZER_DIR" ] && [ -z "$(ls -A $LX_ANONYMIZER_DIR)" ]; then
                      echo "lx-anonymizer directory exists but is empty. Cloning repository..."
                      rm -rf "$LX_ANONYMIZER_DIR"
                    fi

                    LX_ANONYMIZER_REPO="https://github.com/wg-lux/lx-anonymizer"
                    LX_ANONYMIZER_BRANCH="prototype"

                    if [ -d "$LX_ANONYMIZER_DIR" ]; then
                      echo "lx-anonymizer directory exists. Pulling latest changes from $LX_ANONYMIZER_BRANCH..."
                      if [ -f "$LX_ANONYMIZER_DIR/.git/index.lock" ]; then
                        echo "Warning: .git/index.lock exists in $LX_ANONYMIZER_DIR. Skipping git update to avoid conflicts."
                      elif pgrep -f "git.*$LX_ANONYMIZER_DIR" > /dev/null; then
                        echo "Warning: git process running in $LX_ANONYMIZER_DIR. Skipping git update."
                      else
                        sleep $((RANDOM % 3))
                        (cd "$LX_ANONYMIZER_DIR" && git fetch origin && git checkout "$LX_ANONYMIZER_BRANCH" && git reset --hard "origin/$LX_ANONYMIZER_BRANCH")
                      fi
                    else
                      echo "lx-anonymizer directory does not exist. Cloning repository..."
                      git clone -b "$LX_ANONYMIZER_BRANCH" "$LX_ANONYMIZER_REPO" "$LX_ANONYMIZER_DIR"
                    fi              
                  '';
    status      = ''
                    LX_ANONYMIZER_DIR="$ENDOREG_DB_DIR/lx-anonymizer"
                    if [ -f $LX_ANONYMIZER_DIR]; then
                      echo "lx-anonymizer installed"
                      exit 1
                    else
                      echo "running lx-anonymizer setup"
                      exit 0
                    fi
                  '';
  };

  "setup:frontend" = {
    description = "Run git clone for frontend sub‑project";
    after       = [ "devenv:enterShell" ];
    exec        = ''
                    FRONTEND_DIR="$./frontend"
                    cd $FRONTEND_REPO
                    npm ci
                  '';
    status      = ''
                    if [ -d $FRONTEND_DIR/npm_modules ]; then
                      echo "frontend dependencies installed"
                      exit 1
                    else
                      echo "running frontend setup"
                      exit 0
                    fi
                  '';
  };

  "uv:sync" = {
    description = "Run uv sync to synchronize Python packages";
    after       = [ "devenv:enterShell" ];
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
    status      = ''
                  if [ -d .devenv/state/venv ]; then
                    echo "uv sync completed successfully"
                    exit 0
                  else
                    echo "uv sync failed"
                    exit 1
                  fi
                '';
  };
};

in customTasks