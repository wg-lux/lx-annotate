# SETUP GUIDE

## On first install you can run these commands

1. git clone --recursive https://github.com/wg-lux/lx-annotate.git
2. direnv allow
3. python env_setup.py
4. uv sync
5. python manage.py load_base_db_data

## Subsequent installs

1. direnv allow
2. uv sync

## Updating the frontend

1. cd frontend
2. direnv allow
3. npm run build

This installs the env dependencies of the frontend, installs the dependencies and runs the typescript compiler.

## Running the server

You need to run
```
python

python manage.py runserver
```

to start the django server.

In production this changes to



Videos need to be placed in

data/raw_videos

pdfs in

data/raw_pdfs

to start processing.

