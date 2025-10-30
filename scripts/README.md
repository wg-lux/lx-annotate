# Scripts Directory 🛠️

Organized utility scripts for the Lx Annotate project, structured for maintainability and clarity.

## Directory Structure

````markdown
# Scripts Directory 🛠️

Comprehensive utility scripts for the Lx Annotate project, organized for maintainability and professional development workflows.

## Directory Structure

```
scripts/
├── README.md                        # This file - comprehensive script documentation
├── README_FileWatcher.md           # File watcher service documentation
├── ANALYSIS_AND_CLEANUP_PLAN.md    # Scripts organization and cleanup documentation
│
├── core/                            # Core environment and system management
│   ├── environment.py              # Unified environment settings management
│   ├── setup.py                    # Environment setup and initialization
│   ├── system-validation.sh        # Comprehensive system validation with JSON output
│   └── server-run.sh               # Development server management
│
├── database/                        # Database-related utilities
│   ├── ensure_psql.py              # PostgreSQL availability checker
│   ├── fetch_db_pwd_file.py        # Database password management
│   └── make_conf.py                # Configuration file generator
│
├── utilities/                       # General-purpose utilities
│   ├── gpu-check.py                # GPU/CUDA system diagnostics
│   └── test_luxnix_compatibility.py # LuxNix compatibility testing
│
├── cuda/                            # CUDA diagnostics and troubleshooting
│   ├── README.md                   # CUDA troubleshooting guide
│   ├── debug_cuda_pytorch.py       # PyTorch CUDA debugging
│   ├── minimal_cuda_test.py        # Minimal CUDA availability test
│   ├── test_cuda_detailed.py       # Comprehensive CUDA diagnostics
│   └── test_cuda_paths.py          # CUDA path and library verification
│
├── File Processing & Monitoring     # (Root level - core functionality)
│   ├── file_watcher.py             # Main file monitoring service
│   ├── external_file_watcher.py    # Alternative file watcher implementation
│   ├── start_filewatcher.sh        # File watcher service startup script
│   ├── lx-filewatcher.service      # Systemd service configuration
│   └── diagnose_watcher.py         # File watcher diagnostics
│
├── Media & Storage Management       # (Root level - specialized tools)
│   ├── cleanup_invalid_videos.py   # Video file cleanup utility
│   ├── crop_pdf_cli.py             # PDF cropping command-line tool
│   ├── storage_monitor.py          # Storage space monitoring
│   └── hf_cache_manager.py         # Hugging Face cache management
│
└── Legacy Environment Scripts       # (Root level - deprecated but functional)
    ├── set_development_settings.py # Legacy dev settings (use core/environment.py)
    ├── set_production_settings.py  # Legacy prod settings (use core/environment.py)
    ├── set_central_settings.py     # Legacy central settings (use core/environment.py)
    └── environment.py              # Old individual environment script
```

## Script Categories & Documentation

### 🎯 Core Scripts (`core/`)
**Purpose**: Essential system and environment management functionality.

#### `environment.py` - **[CONSOLIDATED SOLUTION]** ⭐
- **Purpose**: Unified environment configuration management
- **Replaces**: `set_development_settings.py`, `set_production_settings.py`, `set_central_settings.py`
- **Usage**: 
  ```bash
  python scripts/core/environment.py development
  python scripts/core/environment.py production
  python scripts/core/environment.py central
  python scripts/core/environment.py show
  ```
- **Features**: 
  - Mode-aware DJANGO_SETTINGS_MODULE configuration
  - Environment variable management
  - Configuration validation
- **DevEnv Integration**: Primary script for environment management

#### `setup.py` - **Environment Initialization** 
- **Purpose**: Handles initial project setup and configuration
- **Usage**: 
  ```bash
  python scripts/core/setup.py
  python scripts/core/setup.py --force  # Force regeneration
  ```
- **Features**:
  - .env file creation from templates
  - Secret key generation
  - Configuration directory setup
  - Database password file management
- **Use Case**: First-time project setup, development environment initialization

#### `system-validation.sh` - **Comprehensive System Validation** ⭐
- **Purpose**: Complete system health check with structured output
- **Usage**: 
  ```bash
  bash scripts/core/system-validation.sh
  bash scripts/core/system-validation.sh --json-only
  bash scripts/core/system-validation.sh --skip-containers
  bash scripts/core/system-validation.sh --force-rebuild
  ```
- **Features**:
  - JSON status output to `status-summary.json`
  - Container build/run testing on validation port 10123
  - Database connectivity verification
  - GPU/CUDA availability testing
  - File structure validation
- **Output**: Structured test results with pass/fail/warning/skip states

#### `server-run.sh` - **Development Server Management**
- **Purpose**: Development server startup and management
- **Usage**: `bash scripts/core/server-run.sh`
- **Features**: Django development server with environment setup

### 🗄️ Database Scripts (`database/`)
**Purpose**: Database setup, configuration, and maintenance utilities.

#### `ensure_psql.py` - **PostgreSQL Availability Checker**
- **Purpose**: Verify PostgreSQL installation and accessibility
- **Usage**: `python scripts/database/ensure_psql.py`
- **Features**: Connection testing, dependency verification
- **DevEnv Integration**: Called by `devenv/services.nix` for database initialization
- **Status**: Active (marked as deprecated in some configs but still functional)

#### `fetch_db_pwd_file.py` - **Database Password Management** ⭐
- **Purpose**: Secure database password file retrieval and management
- **Usage**: `python scripts/database/fetch_db_pwd_file.py`
- **Security Features**: 
  - Secure password file handling from `conf/db_pwd`
  - Environment-aware password management
- **DevEnv Integration**: Used by `devenv/tasks.nix` for secure database setup

#### `make_conf.py` - **Configuration File Generation**
- **Purpose**: Generate database and application configuration files
- **Usage**: `python scripts/database/make_conf.py`
- **Features**: Template-based configuration generation
- **Integration**: Works with configuration templates in `conf_template/`

### 🔧 Utilities (`utilities/`)
**Purpose**: General-purpose diagnostic and maintenance tools.

#### `gpu-check.py` - **GPU/CUDA System Diagnostics** ⭐
- **Purpose**: Hardware compatibility verification for ML workloads
- **Usage**: `python scripts/utilities/gpu-check.py`
- **Output**: 
  - CUDA availability status
  - Device enumeration and properties
  - Memory and processor information
  - Creates timestamped logs in `./data/`
- **DevEnv Integration**: Referenced for hardware diagnostics

#### `test_luxnix_compatibility.py` - **LuxNix Compatibility Testing**
- **Purpose**: Test compatibility with LuxNix environment configurations
- **Usage**: `python scripts/utilities/test_luxnix_compatibility.py`
- **Features**: Environment compatibility validation, dependency checking

### 🚀 CUDA Diagnostics (`cuda/`)
**Purpose**: Specialized CUDA troubleshooting and system validation.

*Comprehensive CUDA diagnostic suite - see `scripts/cuda/README.md` for detailed documentation.*

#### Key CUDA Scripts:
- **`debug_cuda_pytorch.py`** - PyTorch-specific CUDA debugging
- **`minimal_cuda_test.py`** - Quick CUDA availability test
- **`test_cuda_detailed.py`** - Comprehensive CUDA system analysis
- **`test_cuda_paths.py`** - CUDA library and path verification

### 📁 File Processing & Monitoring
**Purpose**: Core file processing and monitoring functionality.

#### `file_watcher.py` - **Main File Monitoring Service** ⭐⭐⭐
- **Purpose**: Automated video and PDF processing service
- **Usage**: `python scripts/file_watcher.py`
- **Monitoring**: 
  - `data/raw_videos/` for automatic video processing
  - `data/raw_pdfs/` for automatic PDF processing
- **Features**:
  - Real-time file system monitoring
  - Automatic video anonymization and segmentation
  - PDF anonymization processing
  - Concurrent processing with thread safety
  - Comprehensive logging and error handling
- **Environment Variables**:
  - `DJANGO_SETTINGS_MODULE`: Django settings (default: lx_annotate.settings_dev)
  - `WATCHER_LOG_LEVEL`: Logging level (default: INFO)
- **Integration**: Core service for automated media processing pipeline

#### `external_file_watcher.py` - **Alternative File Watcher**
- **Purpose**: Alternative implementation of file monitoring service
- **Usage**: `python scripts/external_file_watcher.py`
- **Features**: Different approach to file system monitoring

#### `start_filewatcher.sh` - **File Watcher Service Startup** ⭐
- **Purpose**: Service startup script with environment management
- **Usage**: `bash scripts/start_filewatcher.sh`
- **Features**: 
  - Environment setup and validation
  - Service startup with proper Django settings
  - Development and production mode support

#### `lx-filewatcher.service` - **Systemd Service Configuration**
- **Purpose**: Systemd service definition for file watcher
- **Installation**: Copy to `/etc/systemd/system/` for system-wide service
- **Features**: Automatic startup, restart policies, logging configuration

#### `diagnose_watcher.py` - **File Watcher Diagnostics**
- **Purpose**: Troubleshooting and diagnostic tool for file watcher issues
- **Usage**: `python scripts/diagnose_watcher.py`
- **Features**: Service health monitoring, configuration validation

### 💾 Media & Storage Management  
**Purpose**: Specialized tools for media processing and storage management.

#### `cleanup_invalid_videos.py` - **Video File Cleanup Utility**
- **Purpose**: Clean up corrupted or invalid video files
- **Usage**: `python scripts/cleanup_invalid_videos.py`
- **Features**: Video validation, cleanup operations, integrity checking

#### `crop_pdf_cli.py` - **PDF Cropping Tool**
- **Purpose**: Command-line PDF cropping and processing
- **Usage**: `python scripts/crop_pdf_cli.py [options]`
- **Features**: PDF manipulation, cropping, optimization

#### `storage_monitor.py` - **Storage Space Monitoring**
- **Purpose**: Monitor disk space and storage utilization
- **Usage**: `python scripts/storage_monitor.py`
- **Features**: Space monitoring, alerts, cleanup recommendations

#### `hf_cache_manager.py` - **Hugging Face Cache Management**
- **Purpose**: Manage Hugging Face model cache and downloads
- **Usage**: `python scripts/hf_cache_manager.py`
- **Features**: Cache cleanup, space optimization, model management

### 📜 Legacy Environment Scripts
**Purpose**: Backward compatibility - use `core/environment.py` for new development.

#### Legacy Scripts (Functional but Deprecated):
- **`set_development_settings.py`** → Use `core/environment.py development`
- **`set_production_settings.py`** → Use `core/environment.py production` 
- **`set_central_settings.py`** → Use `core/environment.py central`
- **`environment.py`** (root level) → Use `core/environment.py`

## DevEnv Integration

These scripts are integrated with our DevEnv-based management system for seamless development workflow:

### Primary Integration Points:
```nix
# devenv/scripts.nix
environment = "${scriptsDir}/core/environment.py";
setup = "${scriptsDir}/core/setup.py";
systemValidation = "${scriptsDir}/core/system-validation.sh";
dbSetup = "${scriptsDir}/database/ensure_psql.py";
dbPassword = "${scriptsDir}/database/fetch_db_pwd_file.py";
gpuCheck = "${scriptsDir}/utilities/gpu-check.py";
fileWatcher = "${scriptsDir}/file_watcher.py";
```

### Management Commands:
```nix
# devenv/management.nix
scripts = {
  core = {
    environment = "python scripts/core/environment.py";
    setup = "python scripts/core/setup.py";
    validate = "bash scripts/core/system-validation.sh";
  };
  database = {
    ensure = "python scripts/database/ensure_psql.py";
    password = "python scripts/database/fetch_db_pwd_file.py";
    makeConf = "python scripts/database/make_conf.py";
  };
  utilities = {
    gpuCheck = "python scripts/utilities/gpu-check.py";
    fileWatcher = "python scripts/file_watcher.py";
  };
};
```

### Service Integration:
```nix
# devenv/services.nix
services.postgresql.enable = true;
scripts.database.ensure = before: [ "postgresql" ];

# devenv/processes.nix  
processes.fileWatcher = {
  exec = "python scripts/file_watcher.py";
  process-compose = {
    availability.restart = "on_failure";
  };
};
```

## Usage Examples & Workflows

### 🚀 Initial Project Setup
```bash
# 1. Run environment setup
python scripts/core/setup.py

# 2. Configure development environment
python scripts/core/environment.py development

# 3. Validate system
bash scripts/core/system-validation.sh

# 4. Start file monitoring service
python scripts/file_watcher.py
```

### 🔄 Development Workflow
```bash
# Daily development startup
python scripts/core/environment.py development
bash scripts/core/server-run.sh

# System health check
bash scripts/core/system-validation.sh --json-only

# GPU/CUDA verification for ML work
python scripts/utilities/gpu-check.py
```

### 🏭 Production Deployment
```bash
# Production environment setup
python scripts/core/environment.py production
python scripts/core/setup.py --force

# System validation
bash scripts/core/system-validation.sh --skip-containers

# Start services
systemctl start lx-filewatcher
```

### 🛠️ Maintenance & Diagnostics
```bash
# File watcher diagnostics
python scripts/diagnose_watcher.py

# Storage monitoring
python scripts/storage_monitor.py

# CUDA troubleshooting
python scripts/cuda/test_cuda_detailed.py

# Video cleanup
python scripts/cleanup_invalid_videos.py
```

### 📊 System Monitoring
```bash
# Generate status report
bash scripts/core/system-validation.sh
cat status-summary.json | jq '.'

# Check GPU status
python scripts/utilities/gpu-check.py

# Monitor storage
python scripts/storage_monitor.py
```

## Configuration Files & Dependencies

### Required Configuration Files:
- **`.env`** - Environment variables (generated by `core/setup.py`)
- **`conf/db_pwd`** - Database password file (managed by `database/fetch_db_pwd_file.py`)
- **`conf/db.yaml`** - Database configuration (generated by `database/make_conf.py`)

### Python Dependencies:
- **Django** - Web framework and ORM
- **watchdog** - File system monitoring (file_watcher.py)
- **torch** - GPU/CUDA diagnostics
- **psycopg2** - PostgreSQL connectivity
- **PyYAML** - Configuration file processing

### System Dependencies:
- **PostgreSQL** - Database server
- **CUDA Toolkit** - GPU acceleration (optional)
- **FFmpeg** - Video processing
- **systemd** - Service management (production)

## Development Guidelines

### Adding New Scripts:
1. **Choose appropriate category directory** (`core/`, `database/`, `utilities/`, etc.)
2. **Follow naming conventions** (lowercase with underscores)
3. **Add comprehensive docstring** with usage information
4. **Include command-line argument parsing** using `argparse`
5. **Update this README** with script documentation
6. **Add DevEnv integration** if needed in `devenv/*.nix` files

### Script Requirements:
- **Python 3.12+ compatibility** for all Python scripts
- **Clear error messages and logging** using Python `logging` module
- **Type hints** for function parameters and returns
- **Command-line interface** with `--help` support
- **Integration with DevEnv environment** and path resolution
- **Comprehensive error handling** with graceful failures

### Code Quality Standards:
- **Docstrings** for all functions and classes
- **Type annotations** using modern Python typing
- **Error handling** with specific exception types
- **Logging** instead of print statements for operational output
- **Configuration management** through environment variables
- **Security considerations** for database and file operations

## Security Considerations

### Database Security:
- **Password file management** via `database/fetch_db_pwd_file.py`
- **Secure configuration** generation with restricted permissions
- **Environment-based** credential management

### File Processing Security:
- **Input validation** for file processing scripts
- **Sandboxed execution** for file watcher operations
- **Path traversal protection** in file operations

### Service Security:
- **Process isolation** for file watcher service
- **Resource limits** for processing operations
- **Secure service configuration** in systemd units

## Monitoring & Logging

### Log Locations:
- **File Watcher**: Configurable via `WATCHER_LOG_LEVEL`
- **Django Logs**: Standard Django logging configuration
- **System Validation**: JSON output to `status-summary.json`
- **GPU Diagnostics**: Timestamped files in `./data/`

### Monitoring Integration:
- **JSON status output** for automated monitoring
- **Health check endpoints** via system validation
- **Resource monitoring** through storage monitor
- **Service status** via systemd integration

## Migration & Maintenance

### Recent Migrations:
- **Environment Scripts Consolidation**: 3 scripts → 1 unified solution
- **Script Organization**: Flat structure → Categorized directories  
- **Documentation**: Scattered → Centralized README system
- **System Validation**: Basic → Comprehensive with JSON output

### Maintenance Tasks:
1. **Regular script audits** - Remove unused utilities quarterly
2. **DevEnv synchronization** - Ensure configuration alignment
3. **Security reviews** - Audit file permissions and access patterns
4. **Performance optimization** - Profile frequently-used scripts
5. **Documentation updates** - Keep README current with changes

### Backward Compatibility:
- **Legacy script preservation** - Original scripts remain functional
- **Gradual migration path** - Dual support during transition periods
- **DevEnv references** - All updated to new script locations
- **Documentation** - Migration guides for legacy script users

---

## Additional Resources

- **File Watcher Documentation**: See `README_FileWatcher.md` for detailed service documentation
- **CUDA Troubleshooting**: See `cuda/README.md` for GPU diagnostic procedures  
- **Cleanup Analysis**: See `ANALYSIS_AND_CLEANUP_PLAN.md` for organizational changes
- **DevEnv Configuration**: See `devenv/` directory for environment management

---

*This scripts organization represents the mature state of the Lx Annotate utility management system, providing professional-grade tooling for development, deployment, and maintenance workflows.*
