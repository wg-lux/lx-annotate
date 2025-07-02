{}@inputs:
let
  customTasks = {
  "pytest:init-endoreg-db" = {
    description = "Allow direnv in db sub‑project";
    after       = [ "devenv:enterShell" ];
    # double single‑quotes = bash heredoc in nix,
    # (…) puts the cd in a sub‑shell
    exec        = ''(cd endoreg-db && direnv allow)'';
    status = ''git fetch HEAD && git diff --quiet HEAD -- endoreg-db/.envrc
            '';
  };

  "pytest:run" = {
    description = "Run pytest from project root";
    after       = [ "devenv:enterShell" ];
    exec        = ''
                    source .devenv/state/venv/bin/activate
                    pytest -q
                    '';
    status      = ''
                    if [ -f .devenv/state/venv/bin/activate ]; then
                      echo "pytest:run: ready"
                    else
                      echo "pytest:run: not ready"
                      exit 1
                    fi
                  '';
  };

};


in customTasks