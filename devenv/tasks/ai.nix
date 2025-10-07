# devenv/tasks/default.nix
{ pkgs, lib, config, ... }:
{
  "ai:init-model-weights" = {
    description = "Load base DB data";
    before = [ "devenv:python:uv" "env:export" ];
    # "after" brauchst du hier nicht zwingend
    exec = ''
      python manage.py create_multilabel_model_meta --model_path "./libs/endoreg-db/tests/assets/colo_segmentation_RegNetX800MF_6.ckpt"
    '';
    status = ''
      test -f "./libs/endoreg-db/tests/assets/colo_segmentation_RegNetX800MF_6.ckpt"
    '';
  };
}
