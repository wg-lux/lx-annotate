# devenv/tasks/default.nix
{ pkgs, lib, config, ... }:
{
  "ai:init-model-weights" = {
    description = "Load base DB data";
    before = [ "env:export" ];
    # "after" brauchst du hier nicht zwingend
    exec = ''
      python manage.py create_multilabel_model_meta --template_name default_multilabel_classification
    '';
    status = ''
      python - <<'PY'
from endoreg_db.data import AI_MODEL_META_DATA_DIR
raise SystemExit(0 if (AI_MODEL_META_DATA_DIR / "default_multilabel_classification.yaml").exists() else 1)
PY
    '';
  };
}
