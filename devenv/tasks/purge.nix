{}@inputs:
let
  customTasks = {
  "purge:endoreg-db-envrc" = {
    description = "Remove endoreg-db .envrc file if it exists";
    after       = [ "setup:endoreg-db" ];
    exec        = ''
                    cd $ENDOREG_DB_DIR
                    if [ -f .envrc ]; then
                      echo "Removing .envrc file from endoreg-db"
                      rm -f .envrc
                    else
                      echo ".envrc file not found in endoreg-db"
                    fi
                      '';
    status      = ''
                    if [ -f ./endoreg-db/.envrc ]; then
                      echo "endoreg-db envrc detected. Eliminating."
                      exit 1
                    else
                      echo "Endoreg-db envrc not found. No action needed."
                      exit 0
                    fi
                  '';
  };

  "purge:lx-anonymizer-envrc" = {
    description = "Remove lx-anonymizer .envrc file if it exists";
    after       = [ "setup:lx-anonymizer" ];
    exec        = ''
                    LX_ANONYMIZER_DIR="$ENDOREG_DB_DIR/lx-anonymizer"
                    if [ -d "$LX_ANONYMIZER_DIR" ]; then
                      cd "$LX_ANONYMIZER_DIR"
                      if [ -f .envrc ]; then
                        echo "Removing .envrc file from lx-anonymizer"
                        rm -f .envrc
                      else
                        echo ".envrc file not found in lx-anonymizer"
                      fi
                    else
                      echo "lx-anonymizer directory does not exist. No action needed."
                    fi
                  '';
    status      = ''
                    if [ -f ./endoreg-db/lx-anonymizer/.envrc ]; then
                      echo "lx-anonymizer envrc detected. Eliminating."
                      exit 1
                    else
                      echo "lx-anonymizer envrc not found. No action needed."
                      exit 0
                    fi
                  '';
  };

  "purge:frontend-envrc" = {
    description = "Remove frontend .envrc file if it exists";
    after       = [ "setup:frontend" ];
    exec        = ''
                    if [ -d "$FRONTEND_DIR" ]; then
                      cd "$FRONTEND_DIR"
                      if [ -f .envrc ]; then
                        echo "Removing .envrc file from frontend"
                        rm -f .envrc
                      else
                        echo ".envrc file not found in frontend"
                      fi
                    else
                      echo "frontend directory does not exist. No action needed."
                    fi
                  '';
    status      = ''
                    FRONTEND_DIR="frontend" 
                    if [ -f ./$FRONTEND_DIR/.envrc ]; then
                      echo "frontend envrc detected. Eliminating."
                      exit 1
                    else
                      echo "frontend envrc not found. No action needed."
                      exit 0
                    fi
                  '';
  };
};

in customTasks