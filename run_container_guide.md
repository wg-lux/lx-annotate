```zsh
#Build
podman build -t lx-annotate-app .

#Save
podman save -o lx-annotate-app.tar lx-annotate-app
# podman save lx-annotate-app | gzip > lx-annotate-app.tar.gz

# Load
podman load -i lx-annotate-app.tar
# podman load -i lx-annotate-app.tar.gz

# Run
# Note: This command uses environment variables similar to the ones in k8s.yaml.
# You should replace "your-strong-secret-key" with a real secret.
podman run --rm -it \
  --name lx-annotate-container \
  -p 8080:8000 \
  -v ./data:/data:Z \
  -v ./conf:/app/conf:Z \
  -e SECRET_KEY="your-strong-secret-key" \
  -e WORKING_DIR="/app" \
  -e HOME_DIR="/home/appuser" \
  -e CONF_DIR="/app/conf" \
  -e CONF_TEMPLATE_DIR="/app/conf_template" \
  -e DATA_DIR="/data" \
  -e IMPORT_DIR="/data/import" \
  -e IMPORT_VIDEO_DIR="/data/import/video" \
  -e IMPORT_REPORT_DIR="/data/import/report" \
  -e MODEL_DIR="/data/model" \
  -e STORAGE_DIR="/data/storage" \
  -e DJANGO_HOST="0.0.0.0" \
  -e DJANGO_PORT="8000" \
  -e DJANGO_SETTINGS_MODULE="lx_annotate.settings_dev" \
  -e DJANGO_SETTINGS_MODULE_DEVELOPMENT="lx_annotate.settings_dev" \
  -e DJANGO_SETTINGS_MODULE_PRODUCTION="lx_annotate.settings_prod" \
  -e DJANGO_SETTINGS_MODULE_CENTRAL="lx_annotate.settings_dev" \
  -e DJANGO_DEBUG="True" \
  -e DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1" \
  lx-annotate-app

```