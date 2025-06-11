#!/bin/bash

# CloudIDE+ Development Environment Setup Script
# This script sets up the complete CloudIDE+ development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[SETUP WARN]${NC} $1"
}

error() {
    echo -e "${RED}[SETUP ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[SETUP INFO]${NC} $1"
}

success() {
    echo -e "${PURPLE}[SETUP SUCCESS]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << 'EOF'
 _____ _                 _ _____ _____  _____
/  __ \ |               | |_   _|  _  \|  ___|
| /  \/ | ___  _   _  __| | | | | | | || |__
| |   | |/ _ \| | | |/ _` | | | | | | ||  __|
| \__/\ | (_) | |_| | (_| |_| |_| |/ / | |___
 \____/_|\___/ \__,_|\__,_|\___/|___/  \____/

CloudIDE+ Development Environment Setup
EOF
echo -e "${NC}"

log "Starting CloudIDE+ development environment setup..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    error "This script should not be run as root"
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    log "Checking system requirements..."

    # Check operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        info "Operating System: Linux"
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        info "Operating System: macOS"
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        info "Operating System: Windows"
        OS="windows"
    else
        error "Unsupported operating system: $OSTYPE"
        exit 1
    fi

    # Check required commands
    local required_commands=("git" "curl" "docker" "docker-compose")
    local missing_commands=()

    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            missing_commands+=("$cmd")
        else
            info "✓ $cmd is installed"
        fi
    done

    if [ ${#missing_commands[@]} -ne 0 ]; then
        error "Missing required commands: ${missing_commands[*]}"
        error "Please install the missing commands and run this script again"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
        error "Please start Docker and run this script again"
        exit 1
    fi

    # Check Node.js (optional but recommended)
    if command_exists "node"; then
        NODE_VERSION=$(node --version)
        info "✓ Node.js version: $NODE_VERSION"
    else
        warn "Node.js is not installed (optional for local development)"
    fi

    success "All requirements met!"
}

# Function to setup project structure
setup_project_structure() {
    log "Setting up project structure..."

    # Create workspace directories
    mkdir -p workspace/{projects,templates,shared,temp}
    mkdir -p config/{nginx,ssl,sync}
    mkdir -p docker/{nginx,ssl}
    mkdir -p logs
    mkdir -p monitoring/{prometheus,grafana}
    mkdir -p backups

    # Create empty files for Git tracking
    touch workspace/projects/.gitkeep
    touch workspace/templates/.gitkeep
    touch workspace/shared/.gitkeep
    touch logs/.gitkeep
    touch backups/.gitkeep

    success "Project structure created!"
}

# Function to setup environment configuration
setup_environment() {
    log "Setting up environment configuration..."

    # Copy environment template if .env doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            info "Created .env file from template"
            warn "Please edit .env file with your actual configuration values"
        else
            error ".env.example not found"
            exit 1
        fi
    else
        info ".env file already exists"
    fi

    # Set executable permissions on scripts
    chmod +x scripts/*.sh
    info "Set executable permissions on scripts"

    success "Environment configuration completed!"
}

# Function to install Node.js dependencies
install_dependencies() {
    log "Installing Node.js dependencies..."

    if command_exists "npm"; then
        # Install root dependencies
        npm install
        info "Root dependencies installed"

        # Install workspace dependencies
        npm run install:extensions
        info "Extension dependencies installed"
    else
        warn "npm not available, skipping Node.js dependencies"
    fi

    success "Dependencies installation completed!"
}

# Function to setup Docker environment
setup_docker() {
    log "Setting up Docker environment..."

    # Pull required base images
    info "Pulling Docker base images..."
    docker pull ubuntu:22.04
    docker pull node:20-alpine
    docker pull redis:7-alpine
    docker pull postgres:15-alpine
    docker pull nginx:alpine
    docker pull prom/prometheus:latest
    docker pull grafana/grafana:latest

    # Create Docker networks
    info "Creating Docker networks..."
    docker network create cloudide-network 2>/dev/null || info "Network already exists"

    # Create Docker volumes
    info "Creating Docker volumes..."
    docker volume create cloudide_redis_data 2>/dev/null || info "Redis volume already exists"
    docker volume create cloudide_postgres_data 2>/dev/null || info "Postgres volume already exists"
    docker volume create cloudide_prometheus_data 2>/dev/null || info "Prometheus volume already exists"
    docker volume create cloudide_grafana_data 2>/dev/null || info "Grafana volume already exists"

    success "Docker environment setup completed!"
}

# Function to create development certificates
create_certificates() {
    log "Creating development SSL certificates..."

    SSL_DIR="docker/ssl"
    mkdir -p "$SSL_DIR"

    if [ ! -f "$SSL_DIR/localhost.crt" ]; then
        info "Generating self-signed SSL certificate for localhost..."

        # Create OpenSSL config for localhost
        cat > "$SSL_DIR/localhost.conf" << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CloudIDE
L = CloudIDE
O = CloudIDE+
CN = localhost

[v3_req]
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

        # Generate private key and certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/localhost.key" \
            -out "$SSL_DIR/localhost.crt" \
            -config "$SSL_DIR/localhost.conf" 2>/dev/null

        info "SSL certificate created for development"
    else
        info "SSL certificate already exists"
    fi

    success "SSL certificates setup completed!"
}

# Function to setup Nginx configuration
setup_nginx() {
    log "Setting up Nginx configuration..."

    NGINX_CONF="docker/nginx.conf"

    cat > "$NGINX_CONF" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream cloudide {
        server cloudide-core:8080;
    }

    server {
        listen 80;
        server_name localhost;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name localhost;

        ssl_certificate /etc/nginx/ssl/localhost.crt;
        ssl_certificate_key /etc/nginx/ssl/localhost.key;

        location / {
            proxy_pass http://cloudide;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
EOF

    success "Nginx configuration created!"
}

# Function to setup monitoring
setup_monitoring() {
    log "Setting up monitoring configuration..."

    # Prometheus configuration
    PROMETHEUS_CONF="docker/prometheus.yml"
    mkdir -p "$(dirname "$PROMETHEUS_CONF")"

    cat > "$PROMETHEUS_CONF" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files: []

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'cloudide-core'
    static_configs:
      - targets: ['cloudide-core:8080']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
EOF

    # Grafana datasource configuration
    GRAFANA_DIR="docker/grafana"
    mkdir -p "$GRAFANA_DIR/datasources"

    cat > "$GRAFANA_DIR/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://monitoring:9090
    isDefault: true
EOF

    success "Monitoring configuration created!"
}

# Function to setup database initialization
setup_database() {
    log "Setting up database initialization..."

    DB_INIT="docker/init-db.sql"

    cat > "$DB_INIT" << 'EOF'
-- CloudIDE+ Database Initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    template VARCHAR(100),
    repository_url TEXT,
    deployment_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    deployment_id VARCHAR(255),
    url TEXT,
    status VARCHAR(50) NOT NULL,
    logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File sync table
CREATE TABLE IF NOT EXISTS file_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_file_id VARCHAR(255),
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'pending'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_file_sync_user_id ON file_sync(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EOF

    success "Database initialization script created!"
}

# Function to create extension scaffolding
setup_extensions() {
    log "Setting up extension scaffolding..."

    # Core extension structure
    local extensions=("cloudide-core" "cloud-storage-sync" "one-click-deploy" "collaboration-plus" "ai-coding-assistant" "environment-manager")

    for ext in "${extensions[@]}"; do
        EXT_DIR="cloudide-extensions/$ext"

        if [ ! -d "$EXT_DIR" ]; then
            mkdir -p "$EXT_DIR/src"

            # Create package.json
            cat > "$EXT_DIR/package.json" << EOF
{
  "name": "$ext",
  "displayName": "${ext^}",
  "description": "CloudIDE+ ${ext^} Extension",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.84.0"
  },
  "categories": ["Other"],
  "activationEvents": ["*"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "$ext.hello",
        "title": "Hello from ${ext^}"
      }
    ]
  },
  "scripts": {
    "build": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.84.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vsce": "^2.21.0"
  }
}
EOF

            # Create tsconfig.json
            cat > "$EXT_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
EOF

            # Create basic extension.ts
            cat > "$EXT_DIR/src/extension.ts" << EOF
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('CloudIDE+ ${ext^} extension is now active!');

    const disposable = vscode.commands.registerCommand('$ext.hello', () => {
        vscode.window.showInformationMessage('Hello from CloudIDE+ ${ext^}!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
EOF

            info "Created extension: $ext"
        else
            info "Extension already exists: $ext"
        fi
    done

    success "Extension scaffolding completed!"
}

# Function to create development tools
create_dev_tools() {
    log "Creating development tools..."

    # Create development script
    cat > "scripts/dev.sh" << 'EOF'
#!/bin/bash
# CloudIDE+ Development Helper

set -e

case "$1" in
    "start")
        echo "Starting CloudIDE+ development environment..."
        docker-compose up -d
        ;;
    "stop")
        echo "Stopping CloudIDE+ development environment..."
        docker-compose down
        ;;
    "restart")
        echo "Restarting CloudIDE+ development environment..."
        docker-compose restart
        ;;
    "logs")
        docker-compose logs -f "${2:-cloudide-core}"
        ;;
    "build")
        echo "Building CloudIDE+ extensions..."
        npm run build:extensions
        ;;
    "install")
        echo "Installing dependencies..."
        npm run install:extensions
        ;;
    "clean")
        echo "Cleaning build artifacts..."
        npm run clean
        docker system prune -f
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|build|install|clean}"
        echo "  start    - Start development environment"
        echo "  stop     - Stop development environment"
        echo "  restart  - Restart development environment"
        echo "  logs     - View logs (optionally specify service)"
        echo "  build    - Build extensions"
        echo "  install  - Install dependencies"
        echo "  clean    - Clean build artifacts"
        exit 1
        ;;
esac
EOF

    chmod +x scripts/dev.sh

    success "Development tools created!"
}

# Function to validate setup
validate_setup() {
    log "Validating setup..."

    local validation_passed=true

    # Check required files
    local required_files=(
        "docker-compose.yml"
        "package.json"
        ".env"
        ".gitignore"
        "scripts/start-cloudide.sh"
        "scripts/health-check.sh"
        "docker/Dockerfile.code-server"
        "config/code-server-config.yaml"
        "config/settings.json"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            info "✓ $file exists"
        else
            error "✗ $file is missing"
            validation_passed=false
        fi
    done

    # Check required directories
    local required_dirs=(
        "cloudide-extensions"
        "workspace"
        "docker"
        "config"
        "scripts"
    )

    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            info "✓ $dir directory exists"
        else
            error "✗ $dir directory is missing"
            validation_passed=false
        fi
    done

    if [ "$validation_passed" = true ]; then
        success "All validation checks passed!"
        return 0
    else
        error "Some validation checks failed"
        return 1
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}CloudIDE+ Setup Complete! 🎉${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo -e "1. ${GREEN}Edit configuration:${NC}"
    echo -e "   ${BLUE}nano .env${NC}  # Configure your cloud services"
    echo ""
    echo -e "2. ${GREEN}Start development environment:${NC}"
    echo -e "   ${BLUE}./scripts/dev.sh start${NC}  # Start all services"
    echo ""
    echo -e "3. ${GREEN}Access CloudIDE+:${NC}"
    echo -e "   ${BLUE}http://localhost:8080${NC}  # Web interface"
    echo -e "   Password: ${GREEN}cloudide123${NC} (change in .env)"
    echo ""
    echo -e "4. ${GREEN}Development commands:${NC}"
    echo -e "   ${BLUE}./scripts/dev.sh logs${NC}      # View logs"
    echo -e "   ${BLUE}./scripts/dev.sh build${NC}     # Build extensions"
    echo -e "   ${BLUE}./scripts/dev.sh stop${NC}      # Stop services"
    echo ""
    echo -e "5. ${GREEN}Monitor services:${NC}"
    echo -e "   ${BLUE}http://localhost:3001${NC}  # Grafana dashboard"
    echo -e "   ${BLUE}http://localhost:9090${NC}  # Prometheus metrics"
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}Documentation: ${BLUE}docs/README.md${NC}"
    echo -e "${GREEN}Issues: ${BLUE}https://github.com/yourusername/CloudIDE/issues${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Main setup function
main() {
    log "CloudIDE+ Development Environment Setup v0.1.0"

    check_requirements
    setup_project_structure
    setup_environment
    install_dependencies
    setup_docker
    create_certificates
    setup_nginx
    setup_monitoring
    setup_database
    setup_extensions
    create_dev_tools

    if validate_setup; then
        show_next_steps
        success "CloudIDE+ development environment setup completed successfully!"
        exit 0
    else
        error "Setup validation failed. Please check the errors above."
        exit 1
    fi
}

# Cleanup function for interrupts
cleanup() {
    echo ""
    warn "Setup interrupted by user"
    exit 1
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Run main function
main "$@"
