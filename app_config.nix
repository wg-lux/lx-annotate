# Centralized Application Configuration for Lx Annotate
# =====================================================
# 
# This file contains all core application settings that can be customized.
# Change values here to update the entire application consistently.
#
# To change the port, Django module name, or host, simply update the values
# in this file and rebuild the environment.

rec {
  # Core Application Identity
  app = {
    name = "lx_annotate";
    djangoModule = "lx_annotate";  # Change this to rename your Django project
    version = "1.0.0";
  };

  # Server Configuration  
  server = {
    host = "localhost";    # Change this for different host binding
    port = "8117";         # Change this for different port
    protocol = "http";     # http or https
    
    # Container settings (usually 0.0.0.0 for containers)
    containerHost = "0.0.0.0";
  };

  # Database Configuration
  database = {
    # Development (SQLite)
    dev = {
      engine = "django.db.backends.sqlite3";
      name = "./data/db.sqlite3";
      host = "";
      port = "";
      user = "";
      password = "";
    };
    
    # Production (PostgreSQL)
    prod = {
      engine = "django.db.backends.postgresql";
      name = "endoregDbLocal";
      host = "localhost";  
      port = "5432";
      user = "endoregDbLocal";
      passwordFile = "conf/db_pwd";
    };
  };

  # Directory Structure
  paths = {
    data = "./data";
    conf = "./conf";
    confTemplate = "./conf_template";
    staticFiles = "./staticfiles";
    logs = "./data/logs";
    # home directory is handled dynamically in devenv.nix using builtins.getEnv "HOME"

    # Fallback values for external file watcher

    videoImportDir = "./data/videos";
    reportImportDir = "./data/pdfs";
    
    # Import/Export paths
    import = "./data/import";
    export = "./data/export";
    videos = "./data/videos";
    frames = "./data/frames";
    pdfs = "./data/pdfs";
    modelWeights = "./data/model_weights";
  };

  # Application Settings
  settings = {
    # Performance
    batchSize = "500";
    segmentMinDuration = "3";
    testFrameNumber = "1000";
    
    # Security (will be overridden by generated secrets in .env)
    generateSecrets = true;  # If true, auto-generates DJANGO_SECRET_KEY and DJANGO_SALT
    
    # Debug
    debugMode = {
      development = true;
      production = false;
    };
  };

    # Container Configuration
  containers = {
    # Development container - uses devenv with all development tools
    devImage = "${app.name}-dev";
    
    # Production container - optimized runtime with minimal dependencies
    prodImage = "${app.name}-prod";
    
    # Container registry settings (uncomment when using external registry)
    # registry = "your-registry.com";
    # namespace = "your-namespace";
  };

  # Service Dependencies
  services = {
    postgres = {
      version = "15-alpine";
      port = "5432";
    };
    
    redis = {
      version = "7-alpine";
      port = "6379";
    };
    
    nginx = {
      version = "alpine";
      httpPort = "80";
      httpsPort = "443";
    };
  };
}
