{ lib }:

let
  pathString = value: toString value;
  storageEnvironment =
    dataDir:
    let
      dataRoot = pathString dataDir;
      storageRoot = "${dataRoot}/storage";
      streamableRoot = "${storageRoot}/streamable_videos";
    in
    {
      DATA_DIR = dataRoot;
      LX_ANNOTATE_DATA_DIR = dataRoot;
      STORAGE_DIR = storageRoot;
      PROTECTED_MEDIA_ROOT = storageRoot;
      LX_ANNOTATE_STREAMABLE_VIDEO_ROOT = streamableRoot;
      LX_ANNOTATE_STREAMABLE_VIDEO_RAW_ROOT = "${streamableRoot}/raw";
      LX_ANNOTATE_STREAMABLE_VIDEO_PROCESSED_ROOT = "${streamableRoot}/processed";
    };
in
{
  appOwnedEnvironmentVariables = [
    "DJANGO_SETTINGS_MODULE"
    "DJANGO_SETTINGS_MODULE_PRODUCTION"
    "DJANGO_ENV"
    "STATIC_URL"
    "MEDIA_URL"
    "DATA_DIR"
    "LX_ANNOTATE_DATA_DIR"
    "STORAGE_DIR"
    "PROTECTED_MEDIA_ROOT"
    "LX_ANNOTATE_STREAMABLE_VIDEO_ROOT"
    "LX_ANNOTATE_STREAMABLE_VIDEO_RAW_ROOT"
    "LX_ANNOTATE_STREAMABLE_VIDEO_PROCESSED_ROOT"
    "NGINX_PROTECTED_MEDIA_URL"
    "SERVE_WITH_NGINX"
  ];

  hostOwnedEnvironmentVariables = [
    "HOME_DIR"
    "CONF_DIR"
    "CONF_TEMPLATE_DIR"
    "WORKING_DIR"
    "ASSET_DIR"
    "LX_ANNOTATE_ENCRYPTED_DATA_DIR"
    "LX_ANNOTATE_MASTER_KEY_FILE"
    "XDG_DATA_HOME"
    "DJANGO_STATIC_ROOT"
    "DJANGO_DB_ENGINE"
    "DJANGO_HOST"
    "DJANGO_PORT"
    "BASE_URL"
    "HTTP_PROTOCOL"
    "TIME_ZONE"
    "RUN_VIDEO_TESTS"
    "SKIP_EXPENSIVE_TESTS"
    "VITE_ENABLE_DEBUG"
    "DJANGO_ALLOWED_HOSTS"
    "ALLOWED_HOSTS"
    "DJANGO_CORS_ALLOWED_ORIGINS"
    "DJANGO_CSRF_TRUSTED_ORIGINS"
    "DJANGO_SECRET_KEY_FILE"
    "DJANGO_DB_PASSWORD_FILE"
    "DJANGO_KEYCLOAK_CLIENT_SECRET_FILE"
    "DJANGO_KEYCLOAK_CLIENT_ID"
    "DJANGO_DB_NAME"
    "DJANGO_DB_USER"
    "DJANGO_DB_HOST"
    "DJANGO_DB_PORT"
    "DJANGO_DB_SSLMODE"
    "OIDC_RP_CLIENT_ID"
    "ENFORCE_AUTH"
    "EXEMPT_URLS"
    "LOGIN_URL"
    "LX_ANNOTATE_DEFAULT_CENTER"
    "ENDOREG_DEPLOYMENT_ROLE"
    "ENDOREG_HUB_MODE"
    "ENDOREG_ENABLE_HUB_TRANSFERS"
    "ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT"
    "ENDOREG_HUB_TRANSFER_REQUIRE_MTLS"
    "ENDOREG_HUB_TRANSFER_MTLS_META_KEY"
    "ENDOREG_HUB_TRANSFER_MTLS_META_VALUE"
    "CELERY_BROKER_URL"
    "CELERY_DEFAULT_QUEUE"
    "CELERY_PIPELINE_QUEUE"
    "CELERY_FRAME_EXTRACTION_QUEUE"
    "CELERY_FFMPEG_MEDIA_QUEUE"
    "CELERY_INFERENCE_QUEUE"
    "CELERY_TRAINING_QUEUE"
    "CELERY_LLM_INFERENCE_QUEUE"
    "CELERY_MAINTENANCE_QUEUE"
    "CELERY_FRAME_EXTRACTION_REQUIRE_SECURE_TRANSPORT"
    "CELERY_FFMPEG_MEDIA_REQUIRE_SECURE_TRANSPORT"
    "CELERY_BROKER_SECURE_TRANSPORT_CONFIRMED"
    "MODEL_TRAINING_JOB_MODE"
    "MODEL_TRAINING_STAGING_ROOT"
    "VIDEO_POST_VALIDATION_JOB_MODE"
    "VIDEO_TEMPORAL_INFERENCE_JOB_MODE"
    "VIDEO_TEMPORAL_INFERENCE_FRAME_SOURCE_MODE"
    "REPORT_LLM_JOB_MODE"
    "LLM_ENABLED"
    "LLM_PROVIDER"
    "LLM_BASE_URL"
    "LLM_MODEL"
    "LLM_TIMEOUT"
    "WATCHER_VIDEO_DIR"
    "WATCHER_REPORT_DIR"
    "WATCHER_PREANONYMIZED_DIR"
    "FFMPEG_TRANSCODE_TIMEOUT_SECONDS"
    "TESSDATA_PREFIX"
    "PYTORCH_ALLOC_CONF"
    "SSL_CERT_FILE"
    "REQUESTS_CA_BUNDLE"
    "LX_ANNOTATE_PACKAGE_VERSION"
  ];

  mkAppOwnedEnvironment =
    {
      dataDir,
      settingsModule ? "lx_annotate.settings.settings_prod",
      djangoEnv ? "production",
      staticUrl ? "/static/",
      protectedMediaUrl ? "/protected_media/",
      mediaUrl ? protectedMediaUrl,
      serveWithNginx ? "true",
    }:
    storageEnvironment dataDir
    // {
      DJANGO_SETTINGS_MODULE = settingsModule;
      DJANGO_SETTINGS_MODULE_PRODUCTION = "lx_annotate.settings.settings_prod";
      DJANGO_ENV = djangoEnv;
      STATIC_URL = staticUrl;
      MEDIA_URL = mediaUrl;
      NGINX_PROTECTED_MEDIA_URL = protectedMediaUrl;
      SERVE_WITH_NGINX = serveWithNginx;
    };

  mkHostOwnedEnvironment =
    {
      encryptedDataDir,
      host,
      port,
      deploymentRole,
      xdgDataHome ? null,
      staticRoot ? null,
      extra ? { },
    }:
    {
      LX_ANNOTATE_ENCRYPTED_DATA_DIR = pathString encryptedDataDir;
      DJANGO_HOST = host;
      DJANGO_PORT = toString port;
      ENDOREG_DEPLOYMENT_ROLE = deploymentRole;
    }
    // lib.optionalAttrs (xdgDataHome != null) {
      XDG_DATA_HOME = pathString xdgDataHome;
    }
    // lib.optionalAttrs (staticRoot != null) {
      DJANGO_STATIC_ROOT = pathString staticRoot;
    }
    // extra;
}
