# SETUP GUIDE

## On first install

1. git clone --recursive https://github.com/wg-lux/lx-annotate.git
2. direnv allow
3. python manage.py env_setup.py
4. uv sync
5. python manage.py load_base_db_data.py

## Subsequent installs

1. direnv allow
2. uv sync
