{ 
  dataDir,
  confDir,
  confTemplateDir,
  djangoModuleName,
  host,
  port,
  base_url,
}@inputs:
let

  importDir = "${dataDir}/import";
  importVideoDir = "${importDir}/video";
  importReportDir = "${importDir}/report";
  importLegacyAnnotationDir = "${importDir}/legacy_annotations";
  exportDir = "${dataDir}/export";
  exportFramesRootDir = "${exportDir}/frames";
  exportFramesSampleExportDir = "${exportFramesRootDir}/test_outputs";
  modelDir = "${dataDir}/models";
  libDir = "./libs/";
  lxAnonymizerDir = "${libDir}/lx-anonymizer";
  endoregDbDir = "${libDir}/endoreg-db";
  homeDir = builtins.getEnv "HOME";

  lx_vars = {
    DJANGO_MODULE = djangoModuleName;
    DJANGO_SETTINGS_MODULE_PRODUCTION = "${djangoModuleName}.settings_prod";
    DJANGO_SETTINGS_MODULE_DEVELOPMENT = "${djangoModuleName}.settings_dev";
    # Add central node settings support for luxnix compatibility
    DJANGO_SETTINGS_MODULE_CENTRAL = "${djangoModuleName}.settings_central";
    DJANGO_HOST = host;
    DJANGO_PORT = port;
    DATA_DIR = dataDir;
    STORAGE_DIR = dataDir;
    IMPORT_DIR = importDir;
    IMPORT_VIDEO_DIR = importVideoDir;
    IMPORT_REPORT_DIR = importReportDir;
    IMPORT_LEGACY_ANNOTATION_DIR = importLegacyAnnotationDir;
    EXPORT_DIR = exportDir;
    EXPORT_FRAMES_ROOT_DIR = exportFramesRootDir;
    EXPORT_FRAMES_SAMPLE_EXPORT_DIR = exportFramesSampleExportDir;
    MODEL_DIR = modelDir;
    CONF_DIR = confDir; 
    CONF_TEMPLATE_DIR = confTemplateDir;
    DB_PWD_FILE = "${confDir}/db_pwd";
    DB_CONFIG_FILE = "${confDir}/db.yaml";
    WORKING_DIR = builtins.getEnv "PWD";
    HOME_DIR = homeDir;
    BASE_URL = "http://${host}:${port}";
    FILE_LOG_LEVEL = "INFO";
    LX_ANONYMIZER_DIR = lxAnonymizerDir;
    ENDOREG_DB_DIR = endoregDbDir;
    LIB_DIR = libDir;
    LX_MAINTENANCE_PASSWORD_FILE = "${homeDir}/secrets/vault/SCRT_local_password_maintenance_password";
  };

in lx_vars


