After initial pull:
```shell
direnv allow # will initially fail
uv sync

```

```shell


rm db.sqlite3

python manage.py migrate
python manage.py load_base_db_data

python manage.py create_multilabel_model_meta --model_path endoreg-db/tests/assets/colo_segmentation_RegNetX800MF_6.ckpt
python manage.py import_video endoreg-db/tests/assets/test_instrument.mp4 --segmentation

# run ollama serve in another shell first
# python manage.py import_report endoreg-db/tests/assets/lux-gastro-report.pdf --verbose

```