# File Watcher Service Documentation 📁⚡

Comprehensive automatic file monitoring and processing service for the Lx Annotate project.

## 🎯 Overview

The File Watcher Service provides **real-time automated processing** for media files:

### Primary Service: `file_watcher.py` 
- **Monitors**: `./data/raw_videos/` and `./data/raw_pdfs/`
- **Processes**: Video anonymization, segmentation, and PDF anonymization
- **Architecture**: Event-driven with concurrent processing
- **Integration**: Deep Django ORM integration for database operations

### Alternative Service: `external_file_watcher.py`
- **Monitors**: External directories and import folders
- **Workflow**: Pre-processes files then feeds to main file watcher
- **Use Case**: Integration with external systems and bulk import workflows

## 🚀 Quick Start Guide

### Prerequisites
```bash
# Ensure environment is configured
python scripts/core/environment.py development
python scripts/core/setup.py

# Verify system health
bash scripts/core/system-validation.sh
```

### Service Management

#### 1. **Full Setup and Installation**
```bash
# Complete setup (directories, permissions, systemd service)
./scripts/start_filewatcher.sh setup
```

#### 2. **Start the Service**
```bash
# Production mode (background systemd service)
sudo ./scripts/start_filewatcher.sh start

# Development mode (foreground with detailed logging)
./scripts/start_filewatcher.sh dev

# Direct Python execution (maximum control)
python scripts/file_watcher.py
```

#### 3. **Service Monitoring**
```bash
# Check service status
./scripts/start_filewatcher.sh status

# View real-time logs
./scripts/start_filewatcher.sh logs

# Follow log tail
sudo journalctl -u lx-filewatcher -f

# Diagnose issues
python scripts/diagnose_watcher.py
```

#### 4. **Service Control**
```bash
# Stop service
sudo ./scripts/start_filewatcher.sh stop

# Restart service
sudo ./scripts/start_filewatcher.sh restart

# Reload configuration
sudo systemctl reload lx-filewatcher
```

Simply copy or move files into the monitored directories:

```bash
# Videos
cp my_video.mp4 ./data/raw_videos/

# PDFs
cp my_document.pdf ./data/raw_pdfs/
```

Files will be processed automatically once they are fully written.

### Django Management Command

You can also start the service via Django:

```bash
# Start service
python manage.py start_filewatcher

# Test configuration only
python manage.py start_filewatcher --test

# Process existing files
python manage.py start_filewatcher --existing

# With debug logging
python manage.py start_filewatcher --log-level DEBUG
```

## Available Commands

| Command   | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `setup`   | Full setup (dependencies, directories, test, service installation) |
| `start`   | Start service                                                      |
| `stop`    | Stop service                                                       |
| `restart` | Restart service                                                    |
| `status`  | Show status                                                        |
| `logs`    | Show logs (follow mode)                                            |
| `dev`     | Start in development mode (foreground)                             |
| `test`    | Test configuration                                                 |

## Configuration

### Environment Variables

* `DJANGO_SETTINGS_MODULE`: Django settings (default: `lx_annotate.settings.settings_dev`)
* `WATCHER_LOG_LEVEL`: Log level (default: `INFO`)

### Default Settings

* **Center**: `university_hospital_wuerzburg`
* **Processor**: `olympus_cv_1500`
* **AI Model**: `image_multilabel_classification_colonoscopy_default`

### Directory Structure

```
./data/
├── raw_videos/          # Monitored for video files
├── raw_pdfs/            # Monitored for PDF files
└── ...

./logs/
└── file_watcher.log     # Log file
```

## Systemd Service

### Installation

```bash
# Install service (requires root)
sudo ./scripts/start_filewatcher.sh install-service
```

### Systemd Commands

```bash
sudo systemctl start lx-filewatcher
sudo systemctl stop lx-filewatcher
sudo systemctl status lx-filewatcher
sudo journalctl -u lx-filewatcher -f
sudo systemctl enable lx-filewatcher
```

## Processing

### Videos

1. **Import**: File is imported into the system
2. **Anonymization**: OCR-based extraction and anonymization of patient data
3. **Segmentation**: AI-based analysis and classification of video content
4. **Default Patient Data**: Default values are set if OCR fails

### PDFs

1. **Import**: File is imported into the system
2. **Anonymization**: Text extraction and anonymization of sensitive data

## Troubleshooting

### Check Logs

```bash
./scripts/start_filewatcher.sh logs
# Or directly
tail -f ./logs/file_watcher.log
```

### Common Issues

| Issue               | Solution                                                           |
| ------------------- | ------------------------------------------------------------------ |
| Service won't start | Run `./scripts/start_filewatcher.sh test`                          |
| Files not processed | Check logs and permissions                                         |
| Django error        | Ensure `DJANGO_SETTINGS_MODULE` is set correctly                   |
| Import error        | Reinstall dependencies with `./scripts/start_filewatcher.sh setup` |

### File Stability

The service waits for files to be fully written:

* **Timeout**: 30 seconds
* **Stable Checks**: 3 consecutive size checks
* **Temporary Files**: Ignored if prefixed with `.` or `~`

## Monitoring

### Status

```bash
sudo systemctl is-active lx-filewatcher
./scripts/start_filewatcher.sh status
```

### Performance

* **Memory Limit**: 2GB (systemd)
* **File Descriptors**: 65536 (systemd)
* **Health Check**: Every 10 seconds
* **Restart Policy**: Automatic on failure (10s delay)

## Security

### Systemd Security Settings

* `NoNewPrivileges=true`
* `PrivateTmp=true`
* `ProtectSystem=strict`
* Write access only to required directories

### Permissions

* Runs as `admin` user
* Read/write access limited to required directories
* No elevated privileges needed

## Development

### Development Mode

```bash
./scripts/start_filewatcher.sh dev
```

### Debugging

```bash
python manage.py start_filewatcher --test
python manage.py start_filewatcher --verbosity 2
```

### Customization

* **File Extensions**: Adjust in `AutoProcessingHandler.__init__()`
* **Processing Logic**: Extend `_process_video()` and `_process_pdf()`
* **Default Settings**: Change class variables in `AutoProcessingHandler`

```
```
