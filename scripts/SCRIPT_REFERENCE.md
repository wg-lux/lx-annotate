# Complete Script Reference Guide 📚

Detailed reference documentation for all scripts in the Lx Annotate project.

## Table of Contents

- [Core Scripts](#core-scripts)
- [Database Scripts](#database-scripts)
- [Utility Scripts](#utility-scripts)
- [File Processing Scripts](#file-processing-scripts)
- [Media Management Scripts](#media-management-scripts)
- [CUDA Diagnostic Scripts](#cuda-diagnostic-scripts)
- [Legacy Scripts](#legacy-scripts)

---

## Core Scripts

### `core/environment.py` - **Unified Environment Management** ⭐⭐⭐

**Purpose**: Consolidated environment configuration replacing multiple legacy scripts.

**Command Line Interface**:
```bash
python scripts/core/environment.py <mode> [options]

# Modes:
development     # Set development environment
production      # Set production environment  
central         # Set central node environment
show           # Display current configuration

# Options:
--dry-run      # Show changes without applying
--backup       # Create backup of current .env
--verbose      # Detailed output
```

**Key Features**:
- **Mode switching**: Seamless environment configuration
- **Validation**: Environment variable validation and suggestions
- **Backup**: Automatic backup creation before changes
- **Integration**: DevEnv and Docker compatibility

**Environment Variables Managed**:
```bash
DJANGO_SETTINGS_MODULE     # Django configuration module
DJANGO_DEBUG               # Debug mode toggle
DJANGO_HOST               # Host binding
DJANGO_PORT               # Port configuration
DB_CONFIG_FILE            # Database configuration
LOG_LEVEL                 # Logging verbosity
```

**Usage Examples**:
```bash
# Switch to development mode
python scripts/core/environment.py development

# Preview production changes
python scripts/core/environment.py production --dry-run

# Show current environment
python scripts/core/environment.py show
```

---

### `core/setup.py` - **Project Initialization** ⭐⭐

**Purpose**: Complete project setup and environment initialization.

**Command Line Interface**:
```bash
python scripts/core/setup.py [options]

# Options:
--force                # Force regeneration of existing files
--skip-secrets        # Skip secret key generation
--skip-dirs           # Skip directory creation
--config-only         # Only generate configuration files
--verbose             # Detailed setup progress
```

**Setup Process**:
1. **Directory Structure**: Creates required data directories
2. **Configuration Files**: Generates `.env` from templates
3. **Secret Management**: Creates secure secret keys
4. **Database Setup**: Configures database password files
5. **Permissions**: Sets appropriate file permissions

**Generated Files**:
```
.env                    # Main environment configuration
conf/db_pwd            # Database password file
conf/db.yaml           # Database configuration
data/*/                # Data directory structure
```

**Usage Examples**:
```bash
# Initial project setup
python scripts/core/setup.py

# Force regeneration (destructive)
python scripts/core/setup.py --force

# Configuration only (skip secrets)
python scripts/core/setup.py --config-only
```

---

### `core/system-validation.sh` - **System Health Check** ⭐⭐⭐

**Purpose**: Comprehensive system validation with structured JSON output.

**Command Line Interface**:
```bash
bash scripts/core/system-validation.sh [options]

# Options:
--json-only           # Only output JSON, no console messages
--skip-containers     # Skip container build/run tests
--force-rebuild       # Force container rebuild
--verbose             # Detailed validation output
--port=<PORT>         # Custom validation port (default: 10123)
```

**Validation Categories**:
- **🏗️ Infrastructure**: File structure, dependencies, permissions
- **⚙️ Configuration**: Environment variables, database connectivity
- **🐳 Containers**: Build and run testing on isolated port
- **🚀 GPU/CUDA**: Hardware acceleration availability
- **📊 Database**: Connection and migration status
- **🔧 Services**: Critical service availability

**JSON Output Structure**:
```json
{
  "timestamp": "2025-10-30T12:00:00Z",
  "overall_status": "pass|warn|fail",
  "categories": {
    "infrastructure": { "status": "pass", "tests": [...] },
    "configuration": { "status": "warn", "tests": [...] },
    "containers": { "status": "pass", "tests": [...] },
    "gpu": { "status": "skip", "tests": [...] },
    "database": { "status": "pass", "tests": [...] }
  },
  "summary": {
    "total_tests": 25,
    "passed": 20,
    "warnings": 3,
    "failed": 0,
    "skipped": 2
  }
}
```

**Usage Examples**:
```bash
# Complete system validation
bash scripts/core/system-validation.sh

# Quick JSON check for monitoring
bash scripts/core/system-validation.sh --json-only | jq '.overall_status'

# Skip containers for fast check
bash scripts/core/system-validation.sh --skip-containers
```

---

### `core/server-run.sh` - **Development Server Management**

**Purpose**: Development server startup with environment configuration.

**Command Line Interface**:
```bash
bash scripts/core/server-run.sh [options]

# Options:
--port=<PORT>         # Custom port (default: 8000)
--host=<HOST>         # Custom host (default: 127.0.0.1)
--settings=<MODULE>   # Custom Django settings module
```

**Features**:
- **Environment Setup**: Automatic environment configuration
- **Port Management**: Configurable port with conflict detection
- **Development Mode**: Debug-friendly configuration
- **Hot Reload**: File change detection and auto-restart

---

## Database Scripts

### `database/fetch_db_pwd_file.py` - **Database Password Management** ⭐⭐

**Purpose**: Secure database password file management and retrieval.

**Command Line Interface**:
```bash
python scripts/database/fetch_db_pwd_file.py [options]

# Options:
--create              # Create new password file
--validate            # Validate existing password file
--rotate              # Rotate password (generate new)
--show                # Display password (use with caution)
```

**Security Features**:
- **File Permissions**: Restrictive permissions (600)
- **Validation**: Password strength validation
- **Rotation**: Secure password rotation
- **Environment Integration**: DevEnv and Docker compatibility

**File Locations**:
```
conf/db_pwd           # Primary password file
conf/db_pwd.backup    # Backup password file
```

---

### `database/ensure_psql.py` - **PostgreSQL Availability Checker**

**Purpose**: Verify PostgreSQL installation and connectivity.

**Command Line Interface**:
```bash
python scripts/database/ensure_psql.py [options]

# Options:
--host=<HOST>         # Database host
--port=<PORT>         # Database port
--timeout=<SECONDS>   # Connection timeout
--install-missing     # Attempt to install PostgreSQL if missing
```

**Checks Performed**:
- **Installation**: PostgreSQL server availability
- **Connectivity**: Database connection testing
- **Permissions**: User access verification
- **Version**: PostgreSQL version compatibility

---

### `database/make_conf.py` - **Configuration Generation**

**Purpose**: Generate database and application configuration files.

**Command Line Interface**:
```bash
python scripts/database/make_conf.py [options]

# Options:
--template=<PATH>     # Custom template directory
--output=<PATH>       # Custom output directory
--env=<ENV>           # Environment-specific configuration
```

**Generated Configurations**:
- **Database**: `conf/db.yaml` with connection parameters
- **Application**: Environment-specific settings
- **Docker**: Container configuration files

---

## Utility Scripts

### `utilities/gpu-check.py` - **GPU/CUDA Diagnostics** ⭐⭐

**Purpose**: GPU hardware and CUDA availability verification.

**Command Line Interface**:
```bash
python scripts/utilities/gpu-check.py [options]

# Options:
--detailed            # Detailed GPU information
--benchmark           # Run performance benchmark
--export=<PATH>       # Export results to file
```

**Information Provided**:
- **CUDA Availability**: `torch.cuda.is_available()` status
- **Device Enumeration**: All available GPU devices
- **Memory Information**: Total and available memory per device
- **Compute Capability**: GPU architecture and features
- **Performance**: Basic performance metrics

**Output Example**:
```
Hello from nix-python-devenv (with cuda support)!
Cuda is available: True
Number of usable devices: 1

Device 0: NVIDIA GeForce RTX 3070 Laptop GPU
  Total Memory: 7841.06 MB
  Multiprocessor Count: 40
```

---

### `utilities/test_luxnix_compatibility.py` - **LuxNix Compatibility Testing**

**Purpose**: Test compatibility with LuxNix environment configurations.

**Command Line Interface**:
```bash
python scripts/utilities/test_luxnix_compatibility.py [options]

# Options:
--profile=<PROFILE>   # Test specific LuxNix profile
--comprehensive       # Run all compatibility tests
--report=<PATH>       # Generate compatibility report
```

---

## File Processing Scripts

### `file_watcher.py` - **Main File Monitoring Service** ⭐⭐⭐⭐

**Purpose**: Real-time file system monitoring with automated processing.

**Command Line Interface**:
```bash
python scripts/file_watcher.py [options]

# Options:
--log-level=<LEVEL>   # Logging verbosity (DEBUG, INFO, WARNING, ERROR)
--daemon              # Run as daemon process
--config=<PATH>       # Custom configuration file
--dry-run             # Monitor only, don't process files
```

**Environment Variables**:
```bash
DJANGO_SETTINGS_MODULE    # Django configuration (default: lx_annotate.settings.settings_dev)
WATCHER_LOG_LEVEL        # Logging level (default: INFO)
FILE_WATCHER_DAEMON      # Daemon mode toggle
```

**Monitored Directories**:
- **`data/raw_videos/`**: Video files (`.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`, `.m4v`)
- **`data/raw_pdfs/`**: PDF files (`.pdf`)

**Processing Pipeline**:
1. **File Detection**: Real-time file system events
2. **Validation**: File integrity and format checking
3. **Import**: Database record creation
4. **Processing**: Anonymization and segmentation
5. **Storage**: Organized file storage
6. **Cleanup**: Temporary file management

**Features**:
- **Concurrent Processing**: Multi-threaded file processing
- **File Locking**: Prevents duplicate processing
- **Error Recovery**: Robust error handling and recovery
- **Progress Tracking**: Detailed processing status
- **Integration**: Deep Django ORM integration

---

### `external_file_watcher.py` - **External Directory Monitor**

**Purpose**: Monitor external directories and feed files to main processor.

**Command Line Interface**:
```bash
python scripts/external_file_watcher.py [options]

# Options:
--source=<PATH>       # Source directory to monitor
--target=<PATH>       # Target directory for processed files
--move                # Move files instead of copy
--filter=<PATTERN>    # File pattern filter
```

---

### `start_filewatcher.sh` - **Service Management Script** ⭐⭐

**Purpose**: Complete file watcher service management and startup.

**Command Line Interface**:
```bash
bash scripts/start_filewatcher.sh <command> [options]

# Commands:
setup                 # Complete service setup
start                 # Start systemd service
stop                  # Stop systemd service
restart               # Restart systemd service
status                # Show service status
logs                  # Show service logs
dev                   # Run in development mode
install               # Install systemd service
uninstall             # Remove systemd service

# Options:
--force               # Force operations
--verbose             # Detailed output
```

**Service Features**:
- **Systemd Integration**: Full systemd service support
- **Auto-restart**: Automatic restart on failure
- **Log Management**: Structured logging with rotation
- **Environment Setup**: Automatic environment configuration

---

### `diagnose_watcher.py` - **File Watcher Diagnostics**

**Purpose**: Troubleshoot and diagnose file watcher service issues.

**Command Line Interface**:
```bash
python scripts/diagnose_watcher.py [options]

# Options:
--check-all           # Run all diagnostic checks
--permissions         # Check file permissions
--processes           # Check running processes
--config              # Validate configuration
--logs                # Analyze log files
```

---

## Media Management Scripts

### `cleanup_invalid_videos.py` - **Video File Cleanup**

**Purpose**: Clean up corrupted, invalid, or orphaned video files.

**Command Line Interface**:
```bash
python scripts/cleanup_invalid_videos.py [options]

# Options:
--scan-only           # Scan without deleting
--fix-metadata        # Attempt to fix metadata
--quarantine=<PATH>   # Move invalid files to quarantine
--force               # Force deletion without confirmation
```

---

### `crop_pdf_cli.py` - **PDF Processing Tool**

**Purpose**: Command-line PDF cropping and processing utility.

**Command Line Interface**:
```bash
python scripts/crop_pdf_cli.py <input> <output> [options]

# Options:
--crop=<x,y,w,h>      # Crop coordinates
--quality=<LEVEL>     # Output quality
--optimize            # Optimize file size
```

---

### `storage_monitor.py` - **Storage Monitoring**

**Purpose**: Monitor disk space and storage utilization.

**Command Line Interface**:
```bash
python scripts/storage_monitor.py [options]

# Options:
--threshold=<PERCENT> # Alert threshold percentage
--cleanup             # Suggest cleanup operations
--report=<PATH>       # Generate storage report
```

---

### `hf_cache_manager.py` - **Hugging Face Cache Management**

**Purpose**: Manage Hugging Face model cache and downloads.

**Command Line Interface**:
```bash
python scripts/hf_cache_manager.py [options]

# Options:
--clean               # Clean cache
--size                # Show cache size
--list                # List cached models
--prune=<DAYS>        # Remove models older than N days
```

---

## CUDA Diagnostic Scripts

*See `scripts/cuda/README.md` for comprehensive CUDA diagnostic documentation.*

### Quick Reference:
- **`cuda/minimal_cuda_test.py`** - Basic CUDA availability check
- **`cuda/debug_cuda_pytorch.py`** - PyTorch CUDA debugging
- **`cuda/test_cuda_paths.py`** - Library path diagnostics
- **`cuda/test_cuda_detailed.py`** - Comprehensive CUDA analysis

---

## Legacy Scripts

### Environment Scripts (Use `core/environment.py` instead)
- **`set_development_settings.py`** - Legacy development configuration
- **`set_production_settings.py`** - Legacy production configuration
- **`set_central_settings.py`** - Legacy central node configuration
- **`environment.py`** (root level) - Old environment script

These scripts remain functional for backward compatibility but are superseded by the unified `core/environment.py` solution.

---

## Integration Patterns

### DevEnv Integration
```nix
# devenv/scripts.nix
scripts = {
  environment = "${scriptsDir}/core/environment.py";
  setup = "${scriptsDir}/core/setup.py";
  validate = "${scriptsDir}/core/system-validation.sh";
  fileWatcher = "${scriptsDir}/file_watcher.py";
  gpuCheck = "${scriptsDir}/utilities/gpu-check.py";
};
```

### Service Integration
```nix
# devenv/processes.nix
processes.fileWatcher = {
  exec = "python scripts/file_watcher.py";
  process-compose = {
    availability.restart = "on_failure";
    log_location = "./data/logs/file_watcher.log";
  };
};
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: System Validation
  run: bash scripts/core/system-validation.sh --json-only

- name: GPU Check
  run: python scripts/utilities/gpu-check.py
  
- name: Environment Setup
  run: python scripts/core/environment.py development
```

---

## Best Practices

### Script Usage Guidelines:
1. **Always use absolute paths** when calling scripts
2. **Check exit codes** for error handling
3. **Use appropriate logging levels** for different environments
4. **Validate inputs** before processing
5. **Handle interruption gracefully** (SIGINT, SIGTERM)

### Development Workflow:
1. **Environment Setup**: `python scripts/core/setup.py`
2. **Configuration**: `python scripts/core/environment.py development`
3. **Validation**: `bash scripts/core/system-validation.sh`
4. **Service Start**: `python scripts/file_watcher.py`

### Production Deployment:
1. **System Validation**: `bash scripts/core/system-validation.sh`
2. **Production Config**: `python scripts/core/environment.py production`
3. **Service Installation**: `bash scripts/start_filewatcher.sh install`
4. **Service Start**: `sudo systemctl start lx-filewatcher`

---

*This reference guide provides comprehensive documentation for all scripts in the Lx Annotate project. For additional help, see individual script `--help` options or the main scripts README.md.*