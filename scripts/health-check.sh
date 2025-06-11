#!/bin/bash

# CloudIDE+ Health Check Script
# This script checks the health of CloudIDE+ services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check result
HEALTH_STATUS=0

# Logging functions
log() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[HEALTH WARN]${NC} $1"
    HEALTH_STATUS=1
}

error() {
    echo -e "${RED}[HEALTH ERROR]${NC} $1"
    HEALTH_STATUS=2
}

info() {
    echo -e "${BLUE}[HEALTH INFO]${NC} $1"
}

# Check if code-server is running
check_code_server() {
    info "Checking code-server status..."

    # Check if process is running
    if ! pgrep -f "code-server" > /dev/null; then
        error "Code-server process is not running"
        return 1
    fi

    # Check if port 8080 is listening
    if ! netstat -ln | grep -q ":8080 "; then
        error "Code-server is not listening on port 8080"
        return 1
    fi

    # Check HTTP endpoint
    if command -v curl > /dev/null; then
        if curl -f -s http://localhost:8080/healthz > /dev/null 2>&1; then
            log "Code-server HTTP endpoint is healthy"
        else
            # Try alternative health check
            if curl -f -s -I http://localhost:8080/ | head -n 1 | grep -q "200\|302"; then
                log "Code-server is responding"
            else
                error "Code-server HTTP endpoint is not responding"
                return 1
            fi
        fi
    else
        warn "curl not available, skipping HTTP health check"
    fi

    log "Code-server is healthy"
    return 0
}

# Check workspace accessibility
check_workspace() {
    info "Checking workspace accessibility..."

    WORKSPACE_DIR="${WORKSPACE_DIR:-/home/coder/workspace}"

    if [ ! -d "$WORKSPACE_DIR" ]; then
        error "Workspace directory does not exist: $WORKSPACE_DIR"
        return 1
    fi

    if [ ! -r "$WORKSPACE_DIR" ]; then
        error "Workspace directory is not readable: $WORKSPACE_DIR"
        return 1
    fi

    if [ ! -w "$WORKSPACE_DIR" ]; then
        error "Workspace directory is not writable: $WORKSPACE_DIR"
        return 1
    fi

    log "Workspace is accessible"
    return 0
}

# Check extensions directory
check_extensions() {
    info "Checking extensions..."

    EXTENSIONS_DIR="/home/coder/.local/share/code-server/extensions"

    if [ ! -d "$EXTENSIONS_DIR" ]; then
        warn "Extensions directory does not exist: $EXTENSIONS_DIR"
        return 1
    fi

    # Count installed extensions
    EXT_COUNT=$(find "$EXTENSIONS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
    info "Found $EXT_COUNT installed extensions"

    log "Extensions directory is accessible"
    return 0
}

# Check system resources
check_resources() {
    info "Checking system resources..."

    # Check memory usage
    if command -v free > /dev/null; then
        MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
        if [ "$(echo "$MEMORY_USAGE > 90" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            warn "High memory usage: ${MEMORY_USAGE}%"
        else
            info "Memory usage: ${MEMORY_USAGE}%"
        fi
    fi

    # Check disk usage
    if command -v df > /dev/null; then
        DISK_USAGE=$(df /home/coder | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$DISK_USAGE" -gt 90 ]; then
            warn "High disk usage: ${DISK_USAGE}%"
        else
            info "Disk usage: ${DISK_USAGE}%"
        fi
    fi

    # Check load average
    if [ -f /proc/loadavg ]; then
        LOAD_AVG=$(cat /proc/loadavg | awk '{print $1}')
        info "Load average: $LOAD_AVG"
    fi

    log "System resources checked"
    return 0
}

# Check network connectivity
check_network() {
    info "Checking network connectivity..."

    # Check localhost connectivity
    if ! ping -c 1 localhost > /dev/null 2>&1; then
        error "Cannot ping localhost"
        return 1
    fi

    # Check external connectivity (if available)
    if ping -c 1 -W 5 8.8.8.8 > /dev/null 2>&1; then
        info "External network connectivity available"
    else
        warn "External network connectivity limited"
    fi

    log "Network connectivity checked"
    return 0
}

# Check cloud services connectivity
check_cloud_services() {
    info "Checking cloud services..."

    # Check Google Cloud connectivity
    if [ -n "${GOOGLE_CLOUD_PROJECT}" ]; then
        if command -v gcloud > /dev/null; then
            if gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1; then
                info "Google Cloud authentication active"
            else
                warn "Google Cloud authentication not active"
            fi
        else
            warn "Google Cloud SDK not available"
        fi
    fi

    # Check Firebase connectivity
    if [ -n "${FIREBASE_PROJECT_ID}" ]; then
        if command -v firebase > /dev/null; then
            info "Firebase CLI available"
        else
            warn "Firebase CLI not available"
        fi
    fi

    # Check Docker connectivity
    if command -v docker > /dev/null; then
        if docker info > /dev/null 2>&1; then
            info "Docker daemon is accessible"
        else
            warn "Docker daemon is not accessible"
        fi
    else
        warn "Docker not available"
    fi

    log "Cloud services checked"
    return 0
}

# Check configuration files
check_configuration() {
    info "Checking configuration files..."

    CONFIG_FILE="/home/coder/.config/code-server/config.yaml"
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Code-server configuration file missing: $CONFIG_FILE"
        return 1
    fi

    SETTINGS_FILE="/home/coder/.local/share/code-server/User/settings.json"
    if [ ! -f "$SETTINGS_FILE" ]; then
        warn "VS Code settings file missing: $SETTINGS_FILE"
    fi

    log "Configuration files checked"
    return 0
}

# Check log files
check_logs() {
    info "Checking log files..."

    LOG_DIR="/home/coder/logs"
    if [ -d "$LOG_DIR" ]; then
        LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
        info "Log directory size: $LOG_SIZE"

        # Check for recent errors in logs
        if [ -f "$LOG_DIR/code-server.log" ]; then
            ERROR_COUNT=$(tail -100 "$LOG_DIR/code-server.log" 2>/dev/null | grep -i error | wc -l)
            if [ "$ERROR_COUNT" -gt 0 ]; then
                warn "Found $ERROR_COUNT recent errors in code-server.log"
            fi
        fi
    else
        warn "Log directory not found: $LOG_DIR"
    fi

    log "Log files checked"
    return 0
}

# Main health check function
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}CloudIDE+ Health Check${NC}"
    echo -e "${BLUE}========================================${NC}"

    # Run all health checks
    check_code_server
    check_workspace
    check_extensions
    check_configuration
    check_resources
    check_network
    check_cloud_services
    check_logs

    echo -e "${BLUE}========================================${NC}"

    # Return overall health status
    case $HEALTH_STATUS in
        0)
            echo -e "${GREEN}✅ All health checks passed${NC}"
            echo -e "${GREEN}CloudIDE+ is healthy and ready${NC}"
            ;;
        1)
            echo -e "${YELLOW}⚠️  Some health checks failed with warnings${NC}"
            echo -e "${YELLOW}CloudIDE+ is running but may have limited functionality${NC}"
            ;;
        2)
            echo -e "${RED}❌ Critical health checks failed${NC}"
            echo -e "${RED}CloudIDE+ may not be functioning properly${NC}"
            ;;
    esac

    echo -e "${BLUE}========================================${NC}"

    exit $HEALTH_STATUS
}

# Run health check
main "$@"
