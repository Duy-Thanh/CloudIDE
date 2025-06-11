#!/usr/bin/env bash

# CloudIDE+ Development Setup Script
# This script sets up the complete CloudIDE+ development environment

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CODER_ROOT="$(cd "$PROJECT_ROOT/../coder" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_PASSWORD="CloudIDE+Dev123!"
CLOUDIDE_ENV="${CLOUDIDE_ENV:-development}"
CLOUDIDE_PROFILE="${CLOUDIDE_PROFILE:-dev}"

# Function to print colored output
log() {
    echo -e "${GREEN}[CloudIDE+]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[CloudIDE+ WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[CloudIDE+ ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[CloudIDE+ INFO]${NC} $1"
}

# Function to check dependencies
check_dependencies() {
    log "Checking dependencies..."

    local missing_deps=()

    # Check for required tools
    for cmd in docker docker-compose git curl node npm pnpm go make; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
    fi

    # Check Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi

    log "All dependencies satisfied ✓"
}

# Function to setup environment files
setup_environment() {
    log "Setting up environment configuration..."

    local env_file="$PROJECT_ROOT/.env.dev"

    if [ ! -f "$env_file" ]; then
        cat > "$env_file" << EOF
# CloudIDE+ Development Environment Configuration
CLOUDIDE_ENVIRONMENT=development
CLOUDIDE_LOG_LEVEL=debug
CLOUDIDE_TELEMETRY_ENABLED=false

# Database Configuration
POSTGRES_DB=coder
POSTGRES_USER=coder
POSTGRES_PASSWORD=coder_dev_password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Coder Configuration
CODER_DEV_ADMIN_PASSWORD=$DEFAULT_PASSWORD
CODER_ACCESS_URL=http://localhost:3000
CODER_WILDCARD_ACCESS_URL=*.cloudide.localhost:3000

# CloudIDE+ API Keys (set these for full functionality)
CLOUDIDE_GOOGLE_DRIVE_API_KEY=
CLOUDIDE_FIREBASE_CONFIG=
CLOUDIDE_GEMINI_API_KEY=
CLOUDIDE_ZOHO_SALESIQ_KEY=
CLOUDIDE_CLOUDFLARE_API_TOKEN=
CLOUDFLARE_TUNNEL_TOKEN=

# Feature Flags
CLOUDIDE_GOOGLE_DRIVE_ENABLED=true
CLOUDIDE_FIREBASE_ENABLED=true
CLOUDIDE_GEMINI_ENABLED=true
CLOUDIDE_ZOHO_ENABLED=true
CLOUDIDE_CLOUDFLARE_ENABLED=true
EOF
        log "Created development environment file: $env_file"
        warn "Please edit $env_file and add your API keys for full functionality"
    else
        log "Environment file already exists: $env_file"
    fi
}

# Function to initialize the Coder repository
init_coder_repo() {
    log "Initializing Coder repository..."

    if [ ! -d "$CODER_ROOT" ]; then
        error "Coder repository not found at $CODER_ROOT. Please run this script from the correct directory."
    fi

    cd "$CODER_ROOT"

    # Install frontend dependencies
    if [ ! -d "site/node_modules" ]; then
        log "Installing frontend dependencies..."
        cd site && pnpm install && cd ..
    fi

    # Download Go dependencies
    log "Downloading Go dependencies..."
    go mod download

    log "Coder repository initialized ✓"
}

# Function to build CloudIDE+ extensions
build_extensions() {
    log "Building CloudIDE+ extensions..."

    local extensions_dir="$PROJECT_ROOT/extensions"

    if [ -d "$extensions_dir" ]; then
        cd "$extensions_dir"

        # Build each extension
        for ext_dir in */; do
            if [ -f "$ext_dir/package.json" ]; then
                log "Building extension: $ext_dir"
                cd "$ext_dir"
                npm install
                npm run build 2>/dev/null || true
                cd ..
            fi
        done

        log "Extensions built ✓"
    else
        warn "Extensions directory not found, skipping extension build"
    fi
}

# Function to start services
start_services() {
    log "Starting CloudIDE+ development services..."

    cd "$PROJECT_ROOT"

    # Source environment variables
    if [ -f ".env.dev" ]; then
        set -a
        source ".env.dev"
        set +a
    fi

    # Start services based on profile
    case "$CLOUDIDE_PROFILE" in
        "minimal")
            docker-compose -f docker/docker-compose.dev.yml up -d postgres redis
            ;;
        "dev")
            docker-compose -f docker/docker-compose.dev.yml up -d postgres redis coder-dev frontend-dev
            ;;
        "full")
            docker-compose -f docker/docker-compose.dev.yml --profile dev-tools up -d
            ;;
        "monitoring")
            docker-compose -f docker/docker-compose.dev.yml --profile monitoring up -d
            ;;
        *)
            docker-compose -f docker/docker-compose.dev.yml up -d postgres redis coder-dev
            ;;
    esac

    log "Services started ✓"
}

# Function to wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."

    # Wait for PostgreSQL
    info "Waiting for PostgreSQL..."
    timeout 60 bash -c 'until docker exec cloudide-postgres pg_isready -U coder > /dev/null 2>&1; do sleep 1; done' || error "PostgreSQL failed to start"

    # Wait for Redis
    info "Waiting for Redis..."
    timeout 30 bash -c 'until docker exec cloudide-redis redis-cli ping > /dev/null 2>&1; do sleep 1; done' || error "Redis failed to start"

    # Wait for Coder
    info "Waiting for Coder..."
    timeout 120 bash -c 'until curl -sf http://localhost:3000/healthz > /dev/null 2>&1; do sleep 2; done' || error "Coder failed to start"

    log "All services are ready ✓"
}

# Function to setup initial user
setup_initial_user() {
    log "Setting up initial user..."

    # Try to create admin user
    if docker exec cloudide-coder-dev coder login http://localhost:3000 \
        --first-user-username=admin \
        --first-user-email=admin@cloudide.dev \
        --first-user-password="$DEFAULT_PASSWORD" \
        --first-user-full-name="CloudIDE+ Admin" \
        --first-user-trial=false > /dev/null 2>&1; then
        log "Admin user created successfully"
    else
        warn "Admin user may already exist or creation failed"
    fi

    # Create a test user
    if docker exec cloudide-coder-dev coder users create \
        --email=developer@cloudide.dev \
        --username=developer \
        --full-name="CloudIDE+ Developer" \
        --password="$DEFAULT_PASSWORD" > /dev/null 2>&1; then
        log "Developer user created successfully"
    else
        warn "Developer user may already exist or creation failed"
    fi
}

# Function to setup templates
setup_templates() {
    log "Setting up CloudIDE+ templates..."

    # Check if Docker template exists
    if ! docker exec cloudide-coder-dev coder templates versions list docker > /dev/null 2>&1; then
        # Create Docker template
        info "Creating Docker template..."

        temp_dir=$(mktemp -d)
        docker exec cloudide-coder-dev coder templates init --id docker "$temp_dir"

        # Customize template for CloudIDE+
        cat > "$temp_dir/main.tf" << 'EOF'
terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
      version = "~> 0.12.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
}

# CloudIDE+ Enhanced Docker Template
data "coder_provisioner" "me" {}
data "coder_workspace" "me" {}

# Docker host configuration
variable "docker_host" {
  description = "Docker host"
  default     = "unix:///var/run/docker.sock"
}

# VS Code Server
resource "coder_app" "code-server" {
  agent_id     = coder_agent.dev.id
  slug         = "code-server"
  display_name = "VS Code"
  url          = "http://localhost:8080/?folder=/home/coder"
  icon         = "/icon/code.svg"
  subdomain    = false
  share        = "owner"
}

# CloudIDE+ Dashboard
resource "coder_app" "cloudide-dashboard" {
  agent_id     = coder_agent.dev.id
  slug         = "dashboard"
  display_name = "CloudIDE+ Dashboard"
  url          = "http://localhost:3001"
  icon         = "/icon/dashboard.svg"
  subdomain    = false
  share        = "owner"
}

# Terminal
resource "coder_app" "terminal" {
  agent_id     = coder_agent.dev.id
  slug         = "terminal"
  display_name = "Terminal"
  url          = "http://localhost:8080/terminal"
  icon         = "/icon/terminal.svg"
  subdomain    = false
  share        = "owner"
}

# Development agent
resource "coder_agent" "dev" {
  arch           = data.coder_provisioner.me.arch
  os             = "linux"
  startup_script = <<-EOT
    #!/bin/bash
    set -e

    # Install CloudIDE+ extensions
    /usr/local/bin/code --install-extension cloudide.core
    /usr/local/bin/code --install-extension cloudide.google-drive
    /usr/local/bin/code --install-extension cloudide.deployment

    # Start VS Code Server
    /usr/local/bin/code serve-web --host 0.0.0.0 --port 8080 --without-connection-token
  EOT

  metadata {
    display_name = "CPU Usage"
    key          = "0_cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "RAM Usage"
    key          = "1_ram_usage"
    script       = "coder stat mem"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "Home Disk"
    key          = "3_home_disk"
    script       = "coder stat disk --path /home/coder"
    interval     = 60
    timeout      = 1
  }
}

# Docker container
resource "docker_image" "main" {
  name = "cloudide/workspace:latest"
}

resource "docker_container" "workspace" {
  count = data.coder_workspace.me.start_count
  image = docker_image.main.latest
  name  = "coder-${data.coder_workspace.me.id}"

  hostname = data.coder_workspace.me.name

  env = [
    "CODER_AGENT_TOKEN=${coder_agent.dev.token}",
    "CLOUDIDE_WORKSPACE_ID=${data.coder_workspace.me.id}",
    "CLOUDIDE_USER=${data.coder_workspace.me.owner}"
  ]

  volumes {
    container_path = "/home/coder"
    volume_name    = docker_volume.home_volume.name
  }

  host {
    host = "host.docker.internal"
    ip   = "host-gateway"
  }
}

resource "docker_volume" "home_volume" {
  name = "coder-${data.coder_workspace.me.id}-home"

  lifecycle {
    ignore_changes = all
  }
}

resource "coder_metadata" "workspace_info" {
  count       = data.coder_workspace.me.start_count
  resource_id = docker_container.workspace[0].id

  item {
    key   = "image"
    value = docker_image.main.name
  }

  item {
    key   = "container_id"
    value = docker_container.workspace[0].id
  }
}
EOF

        # Push template
        docker exec cloudide-coder-dev coder templates push docker \
            --directory "$temp_dir" \
            --yes || warn "Failed to create Docker template"

        rm -rf "$temp_dir"
    else
        log "Docker template already exists"
    fi
}

# Function to display startup information
show_info() {
    echo
    log "🚀 CloudIDE+ Development Environment is ready!"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    CloudIDE+ Development URLs                    ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${GREEN}  🌐 Coder Web UI:${NC}     http://localhost:3000"
    echo -e "${GREEN}  💻 VS Code Web:${NC}      http://localhost:8080"
    echo -e "${GREEN}  📧 MailHog:${NC}          http://localhost:8025"
    echo -e "${GREEN}  📊 Prometheus:${NC}       http://localhost:9090"
    echo -e "${GREEN}  📈 Grafana:${NC}          http://localhost:3001"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                        Login Credentials                        ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${YELLOW}  Admin User:${NC}"
    echo -e "    Email:    admin@cloudide.dev"
    echo -e "    Password: $DEFAULT_PASSWORD"
    echo
    echo -e "${YELLOW}  Developer User:${NC}"
    echo -e "    Email:    developer@cloudide.dev"
    echo -e "    Password: $DEFAULT_PASSWORD"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                        Useful Commands                          ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${BLUE}  # View logs:${NC}"
    echo -e "    docker-compose -f docker/docker-compose.dev.yml logs -f"
    echo
    echo -e "${BLUE}  # Stop services:${NC}"
    echo -e "    $0 stop"
    echo
    echo -e "${BLUE}  # Restart services:${NC}"
    echo -e "    $0 restart"
    echo
    echo -e "${BLUE}  # Access Coder CLI:${NC}"
    echo -e "    docker exec -it cloudide-coder-dev coder"
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo
}

# Function to stop services
stop_services() {
    log "Stopping CloudIDE+ development services..."

    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.dev.yml down

    log "Services stopped ✓"
}

# Function to restart services
restart_services() {
    log "Restarting CloudIDE+ development services..."
    stop_services
    start_services
    wait_for_services
    log "Services restarted ✓"
}

# Function to show logs
show_logs() {
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.dev.yml logs -f "${1:-}"
}

# Function to show status
show_status() {
    log "CloudIDE+ Development Environment Status:"
    echo

    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.dev.yml ps
}

# Function to clean up
cleanup() {
    log "Cleaning up CloudIDE+ development environment..."

    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f

    log "Cleanup completed ✓"
}

# Main function
main() {
    case "${1:-start}" in
        "start")
            check_dependencies
            setup_environment
            init_coder_repo
            build_extensions
            start_services
            wait_for_services
            setup_initial_user
            setup_templates
            show_info
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs "${2:-}"
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            echo "CloudIDE+ Development Environment Manager"
            echo
            echo "Usage: $0 [COMMAND]"
            echo
            echo "Commands:"
            echo "  start     Start the development environment (default)"
            echo "  stop      Stop all services"
            echo "  restart   Restart all services"
            echo "  logs      Show logs for all services (or specific service)"
            echo "  status    Show status of all services"
            echo "  cleanup   Stop and remove all containers and volumes"
            echo "  help      Show this help message"
            echo
            echo "Environment Variables:"
            echo "  CLOUDIDE_PROFILE    Service profile (minimal|dev|full|monitoring)"
            echo "  CLOUDIDE_ENV        Environment (development|staging|production)"
            echo
            ;;
        *)
            error "Unknown command: $1. Use '$0 help' for usage information."
            ;;
    esac
}

# Trap to handle interrupts
trap 'error "Script interrupted"' INT TERM

# Run main function
main "$@"
