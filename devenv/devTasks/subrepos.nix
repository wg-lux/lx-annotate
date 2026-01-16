{pkgs, lib, config, ...}@inputs:
let
  ENDOREG_DB_DIR       = "endoreg-db";
  LX_ANONYMIZER_DIR    = "lx-anonymizer";
  FRONTEND_DIR         = "frontend";
  ENDOREG_DB_REPO      = "https://github.com/wg-lux/endoreg-db";
  LX_ANONYMIZER_REPO   = "https://github.com/wg-lux/lx-anonymizer";
  BRANCH               = "prototype";
  customTasks = {
  "setup:endoreg-db" = {
    description = "Clone or update endoreg-db";
    before      = [ "env:build" ];
    after      = [ "devenv:files" ];
    status      = ''
      if [ -d "${ENDOREG_DB_DIR}/.git" ]; then
        echo "endoreg-db already present"; exit 0   # ✅ up-to-date
      else
        exit 1                                       # ❌ needs exec
      fi
    '';
    exec        = ''
      if [ -d "${ENDOREG_DB_DIR}" ]; then
        echo "Pulling ${BRANCH}…"
        ( cd "${ENDOREG_DB_DIR}" &&
          git fetch origin &&
          git checkout "${BRANCH}" &&
          git reset --hard "origin/${BRANCH}" )
      else
        echo "Cloning ${ENDOREG_DB_REPO} (${BRANCH})…"
        git clone -b "${BRANCH}" "${ENDOREG_DB_REPO}" "${ENDOREG_DB_DIR}"
      fi
    '';
  };

  "setup:lx-anonymizer" = {
    description = "Clone or update lx-anonymizer";
    before      = [ "env:build" ];
    after       = [ "purge:endoreg_db_envrc" ];
    status = ''
      [ -d "${ENDOREG_DB_DIR}/${LX_ANONYMIZER_DIR}/.git" ] && exit 0 || exit 1
    '';
    exec = ''
      set -e

      TARGET="${ENDOREG_DB_DIR}/${LX_ANONYMIZER_DIR}"

      if [ -d "$TARGET" ] && [ ! -d "$TARGET/.git" ]; then
        echo "Removing corrupt $TARGET"
        rm -rf "$TARGET"
      fi

      if [ -d "$TARGET/.git" ]; then
        echo "Updating lx-anonymizer…"
        git -C "$TARGET" fetch  --quiet origin "${BRANCH}"
        git -C "$TARGET" checkout -q       "${BRANCH}"
        git -C "$TARGET" reset    -q --hard "origin/${BRANCH}"
      else
        echo "Cloning ${LX_ANONYMIZER_REPO} (${BRANCH})"
        git clone --depth 1 --branch "${BRANCH}" \
          "${LX_ANONYMIZER_REPO}" "$TARGET"
      fi
    '';
  };

  "setup:frontend" = {
    description = "Install frontend NPM deps";
    before      = [ "env:build" ];
    after      = [ "devenv:files" ];
    status      = ''
      if [ -d "${FRONTEND_DIR}/node_modules" ]; then exit 0; else exit 1; fi
    '';
    exec        = ''
      echo "Installing JS packages…"
      cd "${FRONTEND_DIR}"
      npm ci
    '';  
  };
};

in customTasks