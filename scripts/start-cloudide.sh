#!/bin/bash

# CloudIDE+ Startup Script
# This script initializes the CloudIDE+ environment and starts code-server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[CloudIDE+]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[CloudIDE+ WARN]${NC} $1"
}

error() {
    echo -e "${RED}[CloudIDE+ ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[CloudIDE+ INFO]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << 'EOF'
 _____ _                 _ _____ _____  _____   _
/  __ \ |               | |_   _|  _  \|  ___| | |
| /  \/ | ___  _   _  __| | | | | | | || |__   | |_
| |   | |/ _ \| | | |/ _` | | | | | | ||  __|  |  _|
| \__/\ | (_) | |_| | (_| |_| |_| |/ / | |___  | |_
 \____/_|\___/ \__,_|\__,_|\___/|___/  \____/   \__|

EOF
echo -e "${NC}"

log "Starting CloudIDE+ v0.1.0..."

# Environment variables
export CLOUDIDE_VERSION="0.1.0"
export CLOUDIDE_MODE="development"
export NODE_ENV="development"
export SHELL="/bin/bash"
export EDITOR="code-server"
export BROWSER="none"

# Default values
CODE_SERVER_CONFIG="${CODE_SERVER_CONFIG:-/home/coder/.config/code-server/config.yaml}"
WORKSPACE_DIR="${WORKSPACE_DIR:-/home/coder/workspace}"
EXTENSIONS_DIR="${EXTENSIONS_DIR:-/home/coder/extensions}"
PASSWORD="${PASSWORD:-cloudide123}"
SUDO_PASSWORD="${SUDO_PASSWORD:-cloudide123}"

# Create necessary directories
log "Creating workspace directories..."
mkdir -p "${WORKSPACE_DIR}"/{projects,templates,shared,temp}
mkdir -p /home/coder/.config/code-server
mkdir -p /home/coder/.local/share/code-server/extensions
mkdir -p /home/coder/.ssh
mkdir -p /home/coder/.aws
mkdir -p /home/coder/.gcp
mkdir -p /home/coder/logs

# Set permissions
chmod 700 /home/coder/.ssh
chmod 700 /home/coder/.aws
chmod 700 /home/coder/.gcp

# Check if code-server config exists
if [ ! -f "${CODE_SERVER_CONFIG}" ]; then
    warn "Code-server config not found, creating default..."
    cat > "${CODE_SERVER_CONFIG}" << EOF
bind-addr: 0.0.0.0:8080
auth: password
password: ${PASSWORD}
cert: false
disable-telemetry: true
disable-update-check: true
user-data-dir: /home/coder/.local/share/code-server
extensions-dir: /home/coder/.local/share/code-server/extensions
workspace-dir: ${WORKSPACE_DIR}
EOF
fi

# Install CloudIDE+ extensions if available
if [ -d "${EXTENSIONS_DIR}" ] && [ "$(ls -A ${EXTENSIONS_DIR})" ]; then
    log "Installing CloudIDE+ extensions..."
    for ext in "${EXTENSIONS_DIR}"/*.vsix; do
        if [ -f "$ext" ]; then
            info "Installing extension: $(basename "$ext")"
            code-server --install-extension "$ext" --force || warn "Failed to install $(basename "$ext")"
        fi
    done
fi

# Set up Git if not configured
if ! git config --global user.name > /dev/null 2>&1; then
    log "Setting up Git configuration..."
    git config --global user.name "CloudIDE+ User"
    git config --global user.email "user@cloudide.dev"
    git config --global init.defaultBranch main
    git config --global pull.rebase false
    git config --global core.editor "code-server --wait"
fi

# Initialize workspace if empty
if [ ! -f "${WORKSPACE_DIR}/README.md" ]; then
    log "Initializing workspace..."
    cat > "${WORKSPACE_DIR}/README.md" << 'EOF'
# Welcome to CloudIDE+ 🚀

This is your cloud development workspace powered by CloudIDE+.

## Quick Start

1. **Projects**: Create your projects in the `projects/` folder
2. **Templates**: Browse pre-configured templates in the `templates/` folder
3. **Shared**: Collaborate with team members using the `shared/` folder
4. **Extensions**: CloudIDE+ extensions provide powerful cloud integration

## Features

- ☁️ **Cloud Storage Sync**: Automatic synchronization with Google Drive, Dropbox, OneDrive
- 🚀 **One-Click Deploy**: Deploy to Vercel, Netlify, AWS, Google Cloud, Cloudflare
- 🤖 **AI Assistant**: Powered by Gemini API for intelligent code suggestions
- 👥 **Collaboration**: Enhanced team features beyond VS Code Live Share
- 🛠️ **Environment Manager**: Pre-configured development environments

## Getting Started

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "CloudIDE" to see available commands
3. Try "CloudIDE: Create New Project" to get started

Happy coding! 💻
EOF

    # Create example project structure
    mkdir -p "${WORKSPACE_DIR}/projects/welcome-project"
    cat > "${WORKSPACE_DIR}/projects/welcome-project/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CloudIDE+</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 2rem;
            backdrop-filter: blur(10px);
        }
        h1 { color: #FFD700; margin-bottom: 1rem; }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Welcome to CloudIDE+</h1>
        <p>Your powerful cloud development environment is ready!</p>

        <div class="feature">
            <h3>☁️ Cloud Storage Integration</h3>
            <p>Seamlessly sync your files across Google Drive, Dropbox, and OneDrive</p>
        </div>

        <div class="feature">
            <h3>🚀 One-Click Deployments</h3>
            <p>Deploy your projects instantly to Vercel, Netlify, AWS, and more</p>
        </div>

        <div class="feature">
            <h3>🤖 AI-Powered Development</h3>
            <p>Get intelligent code suggestions and assistance from Gemini AI</p>
        </div>

        <div class="feature">
            <h3>👥 Enhanced Collaboration</h3>
            <p>Work together with advanced real-time collaboration tools</p>
        </div>
    </div>
</body>
</html>
EOF
fi

# Set up environment-specific configurations
log "Setting up environment configurations..."

# Development environment setup
if [ "${CLOUDIDE_MODE}" = "development" ]; then
    info "Running in development mode"
    export NODE_ENV="development"
    export DEBUG="cloudide:*"
fi

# Production environment setup
if [ "${CLOUDIDE_MODE}" = "production" ]; then
    info "Running in production mode"
    export NODE_ENV="production"
fi

# Set up cloud service credentials if available
if [ -n "${GOOGLE_CLOUD_PROJECT}" ]; then
    info "Google Cloud Project: ${GOOGLE_CLOUD_PROJECT}"
fi

if [ -n "${FIREBASE_PROJECT_ID}" ]; then
    info "Firebase Project: ${FIREBASE_PROJECT_ID}"
fi

if [ -n "${CLOUDFLARE_API_TOKEN}" ]; then
    info "Cloudflare integration enabled"
fi

# Start background services
log "Starting background services..."

# Start file sync service if configured
if [ -n "${GOOGLE_DRIVE_CLIENT_ID}" ] || [ -n "${DROPBOX_APP_KEY}" ] || [ -n "${ONEDRIVE_CLIENT_ID}" ]; then
    info "Cloud storage sync service will be available"
fi

# Create log directory
mkdir -p /home/coder/logs

# Function to handle graceful shutdown
cleanup() {
    log "Shutting down CloudIDE+ gracefully..."
    if [ -n "${CODE_SERVER_PID}" ]; then
        kill "${CODE_SERVER_PID}" 2>/dev/null || true
        wait "${CODE_SERVER_PID}" 2>/dev/null || true
    fi
    log "CloudIDE+ stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT SIGQUIT

# Health check function
health_check() {
    if curl -f http://localhost:8080/healthz > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for dependencies
log "Checking dependencies..."

# Wait for Redis if configured
if [ -n "${REDIS_URL}" ]; then
    info "Waiting for Redis..."
    timeout=30
    while [ $timeout -gt 0 ] && ! nc -z redis 6379; do
        sleep 1
        timeout=$((timeout - 1))
    done
    if [ $timeout -eq 0 ]; then
        warn "Redis not available, some features may be limited"
    else
        info "Redis connection established"
    fi
fi

# Wait for PostgreSQL if configured
if [ -n "${DATABASE_URL}" ]; then
    info "Waiting for PostgreSQL..."
    timeout=30
    while [ $timeout -gt 0 ] && ! nc -z postgres 5432; do
        sleep 1
        timeout=$((timeout - 1))
    done
    if [ $timeout -eq 0 ]; then
        warn "PostgreSQL not available, some features may be limited"
    else
        info "PostgreSQL connection established"
    fi
fi

# Start code-server
log "Starting code-server..."
info "Access your CloudIDE+ at: http://localhost:8080"
info "Password: ${PASSWORD}"

# Start code-server in background
code-server \
    --config "${CODE_SERVER_CONFIG}" \
    --bind-addr 0.0.0.0:8080 \
    --auth password \
    --disable-telemetry \
    --disable-update-check \
    "${WORKSPACE_DIR}" > /home/coder/logs/code-server.log 2>&1 &

CODE_SERVER_PID=$!

# Wait for code-server to start
log "Waiting for code-server to be ready..."
timeout=60
while [ $timeout -gt 0 ] && ! health_check; do
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -eq 0 ]; then
    error "Code-server failed to start within 60 seconds"
    cat /home/coder/logs/code-server.log
    exit 1
fi

log "CloudIDE+ is ready! 🎉"
info "Code-server is running on http://0.0.0.0:8080"
info "Workspace: ${WORKSPACE_DIR}"
info "Extensions: ${EXTENSIONS_DIR}"

# Print additional information
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}CloudIDE+ Status Dashboard${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "🌐 Web Interface: ${GREEN}http://localhost:8080${NC}"
echo -e "📁 Workspace: ${GREEN}${WORKSPACE_DIR}${NC}"
echo -e "🔧 Extensions: ${GREEN}${EXTENSIONS_DIR}${NC}"
echo -e "📊 Mode: ${GREEN}${CLOUDIDE_MODE}${NC}"
echo -e "🔑 Password: ${GREEN}${PASSWORD}${NC}"
if [ -n "${GOOGLE_CLOUD_PROJECT}" ]; then
    echo -e "☁️  Google Cloud: ${GREEN}${GOOGLE_CLOUD_PROJECT}${NC}"
fi
if [ -n "${FIREBASE_PROJECT_ID}" ]; then
    echo -e "🔥 Firebase: ${GREEN}${FIREBASE_PROJECT_ID}${NC}"
fi
echo -e "${BLUE}========================================${NC}"
echo ""

# Monitor code-server process
while true; do
    if ! kill -0 "${CODE_SERVER_PID}" 2>/dev/null; then
        error "Code-server process died unexpectedly"
        cat /home/coder/logs/code-server.log
        exit 1
    fi

    # Perform periodic health checks
    if ! health_check; then
        warn "Health check failed, code-server may be unresponsive"
    fi

    sleep 30
done
