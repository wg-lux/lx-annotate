#!/usr/bin/env bash
# File Watcher Startup Script for LX-Annotate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="lx-filewatcher"
SERVICE_FILE="$SCRIPT_DIR/lx-filewatcher.service"
SYSTEMD_SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME.service"

echo -e "${GREEN}LX-Annotate File Watcher Setup${NC}"
echo "Project root: $PROJECT_ROOT"
echo "Service file: $SERVICE_FILE"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root for service installation
check_root() {
    if [[ $EUID -eq 0 ]]; then
        return 0
    else
        return 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing Python dependencies..."
    cd "$PROJECT_ROOT"
    cd lx-annotate
    
    if command -v uv &> /dev/null; then
        print_status "Using uv to install dependencies"
        uv sync
    elif command -v pip &> /dev/null; then
        print_status "Using pip to install dependencies"
        pip install watchdog>=3.0.0
    else
        print_error "Neither uv nor pip found. Please install dependencies manually."
        exit 1
    fi
}

# Create required directories
create_directories() {
    print_status "Creating required directories..."
    mkdir -p "$PROJECT_ROOT/data/raw_videos"
    mkdir -p "$PROJECT_ROOT/data/raw_pdfs"
    mkdir -p "$PROJECT_ROOT/logs"
    
    print_status "Directories created:"
    echo "  - $PROJECT_ROOT/data/raw_videos"
    echo "  - $PROJECT_ROOT/data/raw_pdfs"
    echo "  - $PROJECT_ROOT/logs"
}

# Test file watcher
test_watcher() {
    print_status "Testing file watcher..."
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export DJANGO_SETTINGS_MODULE=lx_annotate.settings.dev
    export PYTHONPATH="$PROJECT_ROOT"
    
    # Test import by running the file watcher with test mode
    python scripts/file_watcher.py --help > /dev/null 2>&1
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_status "File watcher test passed"
    else
        # Try alternative test
        python -c "
import os, sys
sys.path.insert(0, '.')
os.environ['DJANGO_SETTINGS_MODULE'] = 'lx_annotate.settings.dev'
import django
django.setup()
print('Django setup successful')
"
        if [ $? -eq 0 ]; then
            print_status "File watcher test passed (Django setup validated)"
        else
            print_error "File watcher test failed"
            exit 1
        fi
    fi
}

# Install systemd service
install_service() {
    if check_root; then
        print_status "Installing systemd service..."
        
        # Copy service file
        cp "$SERVICE_FILE" "$SYSTEMD_SERVICE_PATH"
        
        # Reload systemd
        systemctl daemon-reload
        
        # Enable service
        systemctl enable "$SERVICE_NAME"
        
        print_status "Service installed and enabled"
        print_status "Use 'sudo systemctl start $SERVICE_NAME' to start the service"
        print_status "Use 'sudo systemctl status $SERVICE_NAME' to check status"
    else
        print_warning "Not running as root. Skipping systemd service installation."
        print_warning "To install as system service, run: sudo $0 install-service"
    fi
}

# Start service manually (development mode)
start_dev() {
    print_status "Starting file watcher in development mode..."
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export DJANGO_SETTINGS_MODULE=lx_annotate.settings.dev
    export WATCHER_LOG_LEVEL=DEBUG
    export PYTHONPATH="$PROJECT_ROOT"
    
    # Start watcher
    python scripts/file_watcher.py
}

# Show service status
show_status() {
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_status "Service is running"
        systemctl status "$SERVICE_NAME" --no-pager
    else
        print_warning "Service is not running"
        if systemctl is-enabled --quiet "$SERVICE_NAME"; then
            echo "Service is enabled but not started"
            echo "Start with: sudo systemctl start $SERVICE_NAME"
        else
            echo "Service is not installed"
            echo "Install with: $0 install"
        fi
    fi
}

# Show logs
show_logs() {
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_status "Showing service logs (press Ctrl+C to exit)..."
        journalctl -u "$SERVICE_NAME" -f
    else
        print_status "Showing log file..."
        if [ -f "$PROJECT_ROOT/logs/file_watcher.log" ]; then
            tail -f "$PROJECT_ROOT/logs/file_watcher.log"
        else
            print_warning "No log file found at $PROJECT_ROOT/logs/file_watcher.log"
        fi
    fi
}

# Main function
main() {
    case "${1:-setup}" in
        "setup"|"install")
            install_dependencies
            create_directories
            test_watcher
            install_service
            ;;
        "install-service")
            install_service
            ;;
        "start")
            if check_root; then
                systemctl start "$SERVICE_NAME"
                print_status "Service started"
            else
                print_warning "Not running as root. Starting in development mode..."
                start_dev
            fi
            ;;
        "stop")
            if check_root; then
                systemctl stop "$SERVICE_NAME"
                print_status "Service stopped"
            else
                print_error "Need root privileges to stop service"
                exit 1
            fi
            ;;
        "restart")
            if check_root; then
                systemctl restart "$SERVICE_NAME"
                print_status "Service restarted"
            else
                print_error "Need root privileges to restart service"
                exit 1
            fi
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "dev")
            start_dev
            ;;
        "test")
            test_watcher
            ;;
        *)
            echo "Usage: $0 {setup|install|start|stop|restart|status|logs|dev|test}"
            echo ""
            echo "Commands:"
            echo "  setup     - Install dependencies, create directories, test, and install service"
            echo "  install   - Same as setup"
            echo "  start     - Start the file watcher service"
            echo "  stop      - Stop the file watcher service"
            echo "  restart   - Restart the file watcher service"
            echo "  status    - Show service status"
            echo "  logs      - Show service logs (follow mode)"
            echo "  dev       - Start in development mode (foreground)"
            echo "  test      - Test file watcher imports and configuration"
            echo ""
            echo "Examples:"
            echo "  $0 setup          # Complete setup"
            echo "  $0 dev            # Run in development mode"
            echo "  sudo $0 start     # Start as system service"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"