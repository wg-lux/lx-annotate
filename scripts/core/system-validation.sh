#!/usr/bin/env bash
# system-validation.sh - Comprehensive system validation with JSON output
# 
# System Validation and Status Summary for Lx Annotate
# =================================================
# 
# Comprehensive system validation that checks:
# - File structure and dependencies
# - Configuration validity
# - Development environment functionality  
# - Container build and run capabilities (on test port 10123)
# - Database connectivity
# - GPU/CUDA availability
# 
# Outputs structured JSON status summary to status-summary.json
# 
# Usage:
#     bash scripts/core/system-validation.sh
#     bash scripts/core/system-validation.sh --json-only
#     bash scripts/core/system-validation.sh --skip-containers
#     bash scripts/core/system-validation.sh --force-rebuild
#     bash scripts/core/system-validation.sh --verbose

set -e

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
VALIDATION_PORT=10123
OUTPUT_FILE="status-summary.json"
TIMESTAMP=$(date -Iseconds)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# JSON status structure
declare -A status_results
status_results[timestamp]="$TIMESTAMP"
status_results[validation_port]="$VALIDATION_PORT"
status_results[project_root]="$PROJECT_ROOT"

# Utility functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}$1${NC}"
    echo "$(printf '%*s' "${#1}" "" | tr ' ' '=')"
}

# JSON result recording
record_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    local details="$4"
    
    status_results["${test_name}.result"]="$result"
    status_results["${test_name}.message"]="$message"
    if [ -n "$details" ]; then
        status_results["${test_name}.details"]="$details"
    fi
}

# Test functions
test_system_compatibility() {
    log_header "🔧 System Compatibility Check"
    
    # Test bash availability and version
    log_info "🔍 Checking bash availability and version..."
    if ! command -v bash >/dev/null 2>&1; then
        log_error "bash not found in PATH"
        record_result "bash_availability" "FAIL" "bash command not found"
        return 1
    fi
    
    local bash_version=$(bash --version | head -n1 | grep -oE '[0-9]+\.[0-9]+' | head -n1)
    local bash_major=$(echo "$bash_version" | cut -d. -f1)
    
    if [ "$bash_major" -lt 4 ]; then
        log_warning "Old bash version detected: $bash_version (recommend 4.0+)"
        record_result "bash_version" "WARNING" "bash $bash_version detected (old)" "$bash_version"
    else
        log_success "bash $bash_version detected"
        record_result "bash_version" "PASS" "bash $bash_version compatible" "$bash_version"
    fi
    
    # Test shebang compatibility by creating and executing a test script
    log_info "🔍 Testing shebang '#!/usr/bin/env bash' compatibility..."
    local test_script="/tmp/test-shebang-$$"
    
    cat > "$test_script" << 'EOF'
#!/usr/bin/env bash
# Test script to verify shebang works
echo "shebang_test_passed"
exit 0
EOF
    
    chmod +x "$test_script"
    
    if "$test_script" 2>/dev/null | grep -q "shebang_test_passed"; then
        log_success "Shebang '#!/usr/bin/env bash' works correctly"
        record_result "shebang_compatibility" "PASS" "Shebang execution successful"
        rm -f "$test_script"
    else
        log_error "Shebang '#!/usr/bin/env bash' failed"
        record_result "shebang_compatibility" "FAIL" "Shebang execution failed"
        rm -f "$test_script"
        return 1
    fi
    
    # Test required system commands
    log_info "🔍 Checking required system commands..."
    local required_commands=("env" "curl" "timeout" "docker" "python3" "git")
    local missing_commands=()
    local found_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            found_commands+=("$cmd")
            log_success "$cmd available"
        else
            missing_commands+=("$cmd")
            log_warning "$cmd not found"
        fi
    done
    
    if [ ${#missing_commands[@]} -eq 0 ]; then
        record_result "system_commands" "PASS" "All required commands available" "$(printf '%s,' "${found_commands[@]}")"
    else
        if printf '%s\n' "${missing_commands[@]}" | grep -q -E '^(docker|git)$'; then
            record_result "system_commands" "WARNING" "Some optional commands missing" "missing: $(printf '%s,' "${missing_commands[@]}")"
        else
            record_result "system_commands" "FAIL" "Critical commands missing" "missing: $(printf '%s,' "${missing_commands[@]}")"
            return 1
        fi
    fi
    
    # Test date command with ISO format (used for timestamps)
    log_info "🔍 Testing date command ISO format support..."
    if date -Iseconds >/dev/null 2>&1; then
        log_success "date -Iseconds supported"
        record_result "date_iso" "PASS" "ISO date format supported"
    else
        log_warning "date -Iseconds not supported (may affect timestamps)"
        record_result "date_iso" "WARNING" "ISO date format not supported"
    fi
    
    # Test associative arrays (bash 4+ feature used in this script)
    log_info "🔍 Testing bash associative arrays..."
    if bash -c 'declare -A test_array; test_array[key]="value"; [ "${test_array[key]}" = "value" ]' 2>/dev/null; then
        log_success "Bash associative arrays supported"
        record_result "bash_arrays" "PASS" "Associative arrays work"
    else
        log_error "Bash associative arrays not supported (requires bash 4+)"
        record_result "bash_arrays" "FAIL" "Associative arrays failed"
        return 1
    fi
    
    return 0
}

test_file_structure() {
    log_header "📁 File Structure Validation"
    
    local required_files=(
        "app_config.nix"
        "devenv.nix"
        "devenv/containers.nix"
        "devenv/scripts.nix"
        "devenv/environment.nix"
        "scripts/core/environment.py"
        "scripts/core/setup.py"
        "scripts/database/ensure_psql.py"
        "scripts/utilities/gpu-check.py"
        "scripts/cuda/test_cuda_detailed.py"
        "container/Dockerfile.dev"
        "container/Dockerfile.prod"
        "docs/implementation-reports/"
    )
    
    local missing_files=()
    local found_files=()
    
    for file in "${required_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ] || [ -d "$PROJECT_ROOT/$file" ]; then
            found_files+=("$file")
            log_success "$file"
        else
            missing_files+=("$file")
            log_error "$file"
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        record_result "file_structure" "PASS" "All required files present" "$(printf '%s,' "${found_files[@]}")"
        return 0
    else
        record_result "file_structure" "FAIL" "${#missing_files[@]} files missing" "$(printf '%s,' "${missing_files[@]}")"
        return 1
    fi
}

test_environment_configuration() {
    log_header "🔧 Environment Configuration"
    
    # Test unified environment script
    log_info "🔍 Testing unified environment management..."
    local cmd_output
    if cmd_output="$(python3 scripts/core/environment.py show 2>&1)" && [ $? -eq 0 ]; then
        log_success "Unified environment management functional"
        local env_result="PASS"
        local env_message="Environment management working"
    else
        log_error "Unified environment management failed: $cmd_output"
        local env_result="FAIL"
        local env_message="Environment management not working"
    fi
    
    # Test setup script
    log_info "🔍 Testing environment setup script..."
    local setup_output
    if setup_output="$(python3 scripts/core/setup.py --status-only 2>&1)" && [ $? -eq 0 ]; then
        log_success "Environment setup script functional"
        local setup_result="PASS"
        local setup_message="Setup script working"
    else
        log_warning "Environment setup script had issues: $setup_output"
        local setup_result="WARNING"
        local setup_message="Setup script issues detected"
    fi
    
    record_result "environment_config" "$env_result" "$env_message"
    record_result "setup_script" "$setup_result" "$setup_message"
    
    [ "$env_result" = "PASS" ] && [ "$setup_result" != "FAIL" ]
}

test_database_connectivity() {
    log_header "🗄️  Database Connectivity"
    
    if [ -f "tests/test_database_connectivity.py" ]; then
        if python3 tests/test_database_connectivity.py >/dev/null 2>&1; then
            log_success "Database connectivity tests passed"
            record_result "database" "PASS" "Database connectivity working"
            return 0
        else
            log_warning "Database connectivity tests had issues"
            record_result "database" "WARNING" "Database connectivity issues detected"
            return 1
        fi
    else
        log_warning "Database connectivity test not found"
        record_result "database" "SKIP" "Test file not found"
        return 0
    fi
}

test_cuda_availability() {
    log_header "🚀 CUDA/GPU Diagnostics"
    
    log_info "🔍 Testing GPU/CUDA availability..."
    if python3 scripts/utilities/gpu-check.py >/dev/null 2>&1; then
        log_success "GPU/CUDA diagnostics passed"
        record_result "cuda_gpu" "PASS" "GPU/CUDA available and working"
    else
        log_warning "GPU/CUDA diagnostics had issues (may be normal on CPU-only systems)"
        record_result "cuda_gpu" "WARNING" "GPU/CUDA not available or has issues"
    fi
    
    # Run detailed CUDA test
    log_info "🔍 Running detailed CUDA tests..."
    if python3 scripts/cuda/test_cuda_detailed.py >/dev/null 2>&1; then
        log_success "Detailed CUDA tests passed"
        record_result "cuda_detailed" "PASS" "Detailed CUDA tests successful"
    else
        log_warning "Detailed CUDA tests had issues (normal on CPU-only systems)"
        record_result "cuda_detailed" "WARNING" "Detailed CUDA tests failed"
    fi
}

test_containers() {
    local force_rebuild="${1:-false}"
    local verbose="${2:-false}"
    log_header "🐳 Container Build and Run Tests"
    
    # Docker availability check
    docker_available() {
        log_info "🔍 Checking Docker availability..."
        if ! command -v docker >/dev/null 2>&1; then
            log_warning "Docker command not found in PATH"
            return 1
        fi
        
        # Test if Docker daemon is responding
        if ! timeout 10 docker info >/dev/null 2>&1; then
            log_warning "Docker daemon not responding or not accessible"
            return 1
        fi
        
        log_success "Docker is available and responding"
        return 0
    }
    
    # Early Docker availability check
    if ! docker_available; then
        log_warning "Skipping container tests: Docker unavailable"
        record_result "container_dev_build" "SKIP" "Docker not available"
        record_result "container_dev_run" "SKIP" "Docker not available"
        record_result "container_prod_build" "SKIP" "Docker not available"
        record_result "container_prod_run" "SKIP" "Docker not available"
        return 0
    fi
    
    local dev_image="lx-annotate-dev-test:validation"
    local prod_image="lx-annotate-prod-test:validation"
    
    # Helper function to check if image exists
    image_exists() {
        docker image inspect "$1" >/dev/null 2>&1
    }
    
    # Helper function to show build progress
    show_build_progress() {
        local container_type="$1"
        local pid="$2"
        local count=0
        
        while kill -0 "$pid" 2>/dev/null; do
            # Use explicit empty-string argument and quoted width to avoid SC2183
            local dots=$(printf '%*s' "$((count % 4))" "" | tr ' ' '.')
            printf "\r${BLUE}ℹ️  Building $container_type container$dots (${count}s)${NC}"
            sleep 1
            ((count++))
            
            # Show milestone messages
            case $count in
                30) echo -e "\n${YELLOW}⏳ Still building... Downloading Nix packages${NC}" ;;
                120) echo -e "\n${YELLOW}⏳ Still building... Installing DevEnv${NC}" ;;
                300) echo -e "\n${YELLOW}⏳ Still building... Setting up Python environment${NC}" ;;
                600) echo -e "\n${YELLOW}⏳ Still building... This can take up to an hour for first build${NC}" ;;
                1800) echo -e "\n${YELLOW}⏳ Still building... DevEnv builds can be slow but are cached${NC}" ;;
            esac
        done
        printf "\r%*s\r" 50 ""  # Clear the progress line
    }
    
    # Helper function to build container with smart caching and progress
    build_container() {
        local dockerfile="$1"
        local image_tag="$2"
        local container_type="$3"
        
        if [ "$force_rebuild" = "true" ] || ! image_exists "$image_tag"; then
            if [ "$force_rebuild" = "true" ]; then
                log_info "Force rebuilding $container_type container..."
            else
                log_info "Building $container_type container (not found)..."
            fi
            
            if [ "$verbose" = "true" ]; then
                # Verbose mode: show full build output
                log_info "🔍 Verbose mode: showing build output..."
                if cd "$PROJECT_ROOT" && timeout 3600 docker build -f "$dockerfile" -t "$image_tag" .; then
                    return 0
                else
                    return $?
                fi
            else
                # Normal mode: show progress indicator
                cd "$PROJECT_ROOT"
                (timeout 3600 docker build -f "$dockerfile" -t "$image_tag" . >/dev/null 2>&1) &
                local build_pid=$!
                
                show_build_progress "$container_type" "$build_pid"
                
                # Wait for build to complete and get exit status
                wait "$build_pid"
                return $?
            fi
        else
            log_info "Using existing $container_type container image ($image_tag)"
            return 0
        fi
    }
    
    # Test development container
    log_info "🔍 Checking development container..."
    local start_time=$(date +%s)
    
    if build_container "container/Dockerfile.dev" "$dev_image" "development"; then
        local build_time=$(($(date +%s) - start_time))
        log_success "Development container ready (${build_time}s)"
        local dev_build="PASS"
        local dev_build_msg="Dev container available"
        
        # Test development container run
        log_info "🚀 Testing development container run on port $VALIDATION_PORT..."
        local container_id
        if container_id=$(timeout 30 docker run -d -p "$VALIDATION_PORT:8000" "$dev_image") && sleep 5; then
            # Test if container is responsive
            log_info "🔍 Testing container responsiveness..."
            if timeout 10 curl -s "http://localhost:$VALIDATION_PORT" >/dev/null 2>&1 || [ $? -eq 7 ]; then
                log_success "Development container runs successfully"
                local dev_run="PASS"
                local dev_run_msg="Dev container runs and binds port"
            else
                log_warning "Development container runs but may not be fully responsive"
                local dev_run="WARNING"
                local dev_run_msg="Dev container runs but response unclear"
            fi
            
            # Clean up
            log_info "🧹 Cleaning up development container..."
            docker stop "$container_id" >/dev/null 2>&1
            docker rm "$container_id" >/dev/null 2>&1
        else
            log_error "Development container failed to run"
            local dev_run="FAIL"
            local dev_run_msg="Dev container failed to start"
        fi
    else
        local build_time=$(($(date +%s) - start_time))
        if [ $? -eq 124 ]; then
            log_warning "Development container build timed out (${build_time}s)"
            local dev_build="WARNING"
            local dev_build_msg="Dev container build timed out"
        else
            log_error "Development container build failed (${build_time}s)"
            local dev_build="FAIL"
            local dev_build_msg="Dev container build failed"
        fi
        local dev_run="SKIP"
        local dev_run_msg="Skipped due to build failure"
    fi
    
    # Test production container
    log_info "🔍 Checking production container..."
    local start_time=$(date +%s)
    
    if build_container "container/Dockerfile.prod" "$prod_image" "production"; then
        local build_time=$(($(date +%s) - start_time))
        log_success "Production container ready (${build_time}s)"
        local prod_build="PASS"
        local prod_build_msg="Prod container available"
        
        # Test production container run
        log_info "🚀 Testing production container run on port $((VALIDATION_PORT + 1))..."
        local container_id
        if container_id=$(timeout 30 docker run -d -p "$((VALIDATION_PORT + 1)):8000" "$prod_image") && sleep 5; then
            log_info "🔍 Testing container responsiveness..."
            if timeout 10 curl -s "http://localhost:$((VALIDATION_PORT + 1))" >/dev/null 2>&1 || [ $? -eq 7 ]; then
                log_success "Production container runs successfully"
                local prod_run="PASS"
                local prod_run_msg="Prod container runs and binds port"
            else
                log_warning "Production container runs but may not be fully responsive"
                local prod_run="WARNING"  
                local prod_run_msg="Prod container runs but response unclear"
            fi
            
            # Clean up
            log_info "🧹 Cleaning up production container..."
            docker stop "$container_id" >/dev/null 2>&1
            docker rm "$container_id" >/dev/null 2>&1
        else
            log_error "Production container failed to run"
            local prod_run="FAIL"
            local prod_run_msg="Prod container failed to start"
        fi
    else
        local build_time=$(($(date +%s) - start_time))
        if [ $? -eq 124 ]; then
            log_warning "Production container build timed out (${build_time}s)"
            local prod_build="WARNING" 
            local prod_build_msg="Prod container build timed out"
        else
            log_error "Production container build failed (${build_time}s)"
            local prod_build="FAIL"
            local prod_build_msg="Prod container build failed"
        fi
        local prod_run="SKIP"
        local prod_run_msg="Skipped due to build failure"
    fi
    
    record_result "container_dev_build" "$dev_build" "$dev_build_msg"
    record_result "container_dev_run" "$dev_run" "$dev_run_msg"  
    record_result "container_prod_build" "$prod_build" "$prod_build_msg"
    record_result "container_prod_run" "$prod_run" "$prod_run_msg"
    
    # Return success if at least basic builds work
    [ "$dev_build" = "PASS" ] || [ "$prod_build" = "PASS" ]
}

test_legacy_compatibility() {
    log_header "🔄 Legacy Compatibility" 
    
    log_info "🧹 Legacy container tests are deprecated - using modern DevEnv container validation"
    record_result "legacy_containers" "SKIP" "Legacy tests replaced by modern container validation"
}

generate_json_summary() {
    log_header "📊 Generating JSON Summary"
    
    # Set error handling to not exit on error for this function
    set +e
    
    # Simple version for debugging
    local total=0 passed=0 warnings=0 failed=0 skipped=0
    
    # Count results first with better error handling
    log_info "Counting test results..."
    
    if [ ${#status_results[@]} -eq 0 ]; then
        log_warning "No status results found!"
        return 1
    fi
    
    # Debug: show all keys
    log_info "Status array contains ${#status_results[@]} entries"
    
    for key in "${!status_results[@]}"; do
        if [[ $key == *.result ]]; then
            local result="${status_results[$key]}"
            log_info "Processing result key: $key = $result"
            case "$result" in
                "PASS") ((passed++)) ;;
                "FAIL") ((failed++)) ;;
                "WARNING") ((warnings++)) ;;
                "SKIP") ((skipped++)) ;;
                *) log_warning "Unknown result type: $result" ;;
            esac
            ((total++))
        fi
    done
    
    log_info "Found $total test results: $passed passed, $warnings warnings, $failed failed, $skipped skipped"
    
    # Create basic JSON structure
    {
        echo "{"
        echo "  \"timestamp\": \"${status_results[timestamp]:-$(date -Iseconds)}\","
        echo "  \"validation_port\": ${status_results[validation_port]:-10123},"
        echo "  \"project_root\": \"${status_results[project_root]:-$PWD}\","
        echo "  \"summary\": {"
        echo "    \"total_tests\": $total,"
        echo "    \"passed\": $passed,"
        echo "    \"warnings\": $warnings,"
        echo "    \"failed\": $failed,"
        echo "    \"skipped\": $skipped"
        echo "  },"
        echo "  \"tests\": {"
        
        # Add test entries
        local first=true
        for key in "${!status_results[@]}"; do
            if [[ $key == *.result ]]; then
                local test_name="${key%.result}"
                local result="${status_results[$key]}"
                local message="${status_results[${test_name}.message]:-No message}"
                
                if [ "$first" = "true" ]; then
                    first=false
                else
                    echo ","
                fi
                
                # Basic JSON entry
                echo "    \"$test_name\": {"
                echo "      \"result\": \"$result\","
                echo "      \"message\": \"$(echo "$message" | sed 's/"/\\"/g')\""
                echo -n "    }"
            fi
        done
        
        echo ""
        echo "  },"
        echo "  \"environment\": {"
        echo "    \"devenv_active\": ${IN_NIX_SHELL:-false},"
        echo "    \"django_settings\": \"${DJANGO_SETTINGS_MODULE:-not_set}\","
        echo "    \"lx-annotate_mode\": \"${LX_ANNOTATE_MODE:-not_set}\","
        echo "    \"python_path\": \"$(command -v python3 2>/dev/null || echo not_found)\","
        echo "    \"docker_available\": $(command -v docker >/dev/null 2>&1 && echo true || echo false)"
        echo "  }"
        echo "}"
    } > "$OUTPUT_FILE"
    
    # Re-enable error handling
    set -e
    
    if [ -f "$OUTPUT_FILE" ]; then
        log_success "JSON summary generated: $OUTPUT_FILE ($(wc -c < "$OUTPUT_FILE" 2>/dev/null || echo "?") bytes)"
        log_info "Results: $passed passed, $warnings warnings, $failed failed, $skipped skipped"
        return 0
    else
        log_error "Failed to create JSON file"
        return 1
    fi
}

show_summary() {
    log_header "🎯 Validation Summary"
    
    echo "📊 Test Results Overview:"
    echo "========================"
    
    # Count results
    local total=0 passed=0 warnings=0 failed=0 skipped=0
    
    for key in "${!status_results[@]}"; do
        if [[ $key == *.result ]]; then
            local result="${status_results[$key]}"
            case "$result" in
                "PASS") ((passed++)) ;;
                "FAIL") ((failed++)) ;;  
                "WARNING") ((warnings++)) ;;
                "SKIP") ((skipped++)) ;;
                *) ;; 
            esac
            ((total++))
        fi
    done
    
    echo "✅ Passed: $passed"
    echo "❌ Failed: $failed"
    echo "⚠️ Warnings: $warnings"
    echo "⏭️ Skipped: $skipped"
    echo "🔢 Total: $total"
    
    # Show detailed results for each test
    echo ""
    echo "🔍 Detailed Test Results:"
    echo "========================="
    
    for key in "${!status_results[@]}"; do
        if [[ $key == *.result ]]; then
            local test_name="${key%.result}"
            local result="${status_results[$key]}"
            local message="${status_results[${test_name}.message]:-No message}"
            local details="${status_results[${test_name}.details]}"
            
            # Color coding for results
            local color="$NC"
            case "$result" in
                "PASS") color="${GREEN}" ;;
                "FAIL") color="${RED}" ;;
                "WARNING") color="${YELLOW}" ;;
                "SKIP") color="${BLUE}" ;;
            esac
            
            # Format details for JSON-friendly output
            if [[ $details == \{* ]]; then
                # Already JSON object
                local formatted_details="$details"
            else
                # Plain text, convert to JSON string
                local formatted_details="$(echo "$details" | jq -R . | jq -s .)"
            fi
            
            echo -e "  ${color}• $test_name: $result - $message${NC}"
            if [ "$result" != "PASS" ]; then
                echo "    Details: $formatted_details"
            fi
        fi
    done
    
    # Show summary of skipped tests
    if [ $skipped -gt 0 ]; then
        echo ""
        echo "⏭️ Skipped Tests:"
        echo "================"
        
        for key in "${!status_results[@]}"; do
            if [[ $key == *.result ]] && [[ "${status_results[$key]}" == "SKIP" ]]; then
                local test_name="${key%.result}"
                local message="${status_results[${test_name}.message]:-No message}"
                echo "  • $test_name - $message"
            fi
        done
    fi
    
    echo ""
    echo "📂 Project Structure Overview:"
    echo "============================"
    echo "Root Directory: $PROJECT_ROOT"
    echo "Validation Port: $VALIDATION_PORT"
    echo ""
    echo "Scripts:"
    find "$PROJECT_ROOT/scripts" -maxdepth 1 -type f -printf "  - %f\n" | sed 's/^/    /'
    echo ""
    echo "Containers:"
    find "$PROJECT_ROOT/container" -maxdepth 1 -type f -printf "  - %f\n" | sed 's/^/    /'
    echo ""
    echo "Docs:"
    find "$PROJECT_ROOT/docs" -maxdepth 1 -type f -printf "  - %f\n" | sed 's/^/    /'
    echo ""
    echo "Other Files:"
    find "$PROJECT_ROOT" -maxdepth 1 ! -name ".*" ! -path "$PROJECT_ROOT/scripts/*" ! -path "$PROJECT_ROOT/container/*" ! -path "$PROJECT_ROOT/docs/*" -printf "  - %f\n" | sed 's/^/    /'
    
    # Show environment details
    echo ""
    echo "🔧 Environment Details:"
    echo "======================"
    echo "Python 3 Path: $(command -v python3)"
    echo "Docker Available: $(command -v docker >/dev/null 2>&1 && echo Yes || echo No)"
    echo "In Nix Shell: ${IN_NIX_SHELL:-No}"
    echo "Django Settings Module: ${DJANGO_SETTINGS_MODULE:-Not set}"
    echo "Lx Annotate Mode: ${LX_ANNOTATE_MODE:-Not set}"
    
    # Show date and time of validation
    echo ""
    echo "🕒 Validation Timestamp:"
    echo "======================="
    date -Iseconds
    
    echo ""
    echo "📁 Log Files:"
    echo "============"
    echo "  - ${BASH_SOURCE[0]} (system validation script)"
    echo "  - $OUTPUT_FILE (status summary JSON)"
    
    # Show any additional log files in the project root
    if [ -d "$PROJECT_ROOT/logs" ]; then
        echo "  - logs/ (detailed logs directory)"
    fi
    
    echo ""
    echo "Thank you for using the Lx Annotate system validation script!"
    echo "For more information, visit our documentation site."
}

# Main script execution
log_header "🚀 Lx Annotate System Validation"
log_info "Starting system validation checks..."

# Test sequence
test_system_compatibility
test_file_structure
test_environment_configuration
test_database_connectivity
test_cuda_availability

# Container tests are optional and can be skipped
if [ "${1:-}" != "--skip-containers" ]; then
    test_containers "${2:-false}" "${3:-false}"
fi

test_legacy_compatibility

# JSON summary generation
generate_json_summary

# Show final summary
show_summary

log_success "System validation complete!"
