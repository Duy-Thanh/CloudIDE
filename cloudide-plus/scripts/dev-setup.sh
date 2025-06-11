#!/bin/bash

# CloudIDE+ Development Setup Script
# Automates the setup and management of CloudIDE+ development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# CloudIDE+ ASCII Art
print_logo() {
    echo -e "${CYAN}"
    cat << "EOF"
   _____ _                 _ _____ _____  ______
  / ____| |               | |_   _|  __ \|  ____|_
 | |    | | ___  _   _  __| | | | | |  | | |__  _| |_
 | |    | |/ _ \| | | |/ _` | | | | |  | |  __||_   _|
 | |____| | (_) | |_| | (_| |_| |_| |__| | |____ |_|
  \_____|_|\___/ \__,_|\__,_|_____|_____/|______|

EOF
    echo -e "${NC}"
    echo -e "${BLUE}🚀 CloudIDE+ Development Environment Setup${NC}"
    echo -e "${BLUE}Building the Future of Cloud Development${NC}"
    echo ""
}

# Check if Docker is installed and running
check_docker() {
    echo -e "${YELLOW}🔍 Checking Docker installation...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo -e "${YELLOW}Please install Docker from: https://docs.docker.com/get-docker/${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon is not running${NC}"
        echo -e "${YELLOW}Please start Docker and try again${NC}"
        exit 1
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not available${NC}"
        echo -e "${YELLOW}Please install Docker Compose${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Docker is ready${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}⚠️  Node.js not found. Installing via container...${NC}"
    else
        echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is required but not installed${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Git: $(git --version)${NC}"
    fi

    # Check available disk space (minimum 10GB)
    available_space=$(df . | tail -1 | awk '{print $4}')
    required_space=10485760  # 10GB in KB

    if [ "$available_space" -lt "$required_space" ]; then
        echo -e "${YELLOW}⚠️  Low disk space. CloudIDE+ requires at least 10GB${NC}"
    else
        echo -e "${GREEN}✅ Sufficient disk space available${NC}"
    fi
}

# Create environment file
create_env_file() {
    echo -e "${YELLOW}📝 Creating environment configuration...${NC}"

    ENV_FILE=".env.development"

    if [ ! -f "$ENV_FILE" ]; then
        cat > "$ENV_FILE" << EOF
# CloudIDE+ Development Environment Configuration
# Copy this file to .env and configure your API keys

# Database Configuration
POSTGRES_DB=coder
POSTGRES_USER=coder
POSTGRES_PASSWORD=coder_dev_password

# Redis Configuration
REDIS_PASSWORD=

# Coder Configuration
CODER_HTTP_ADDRESS=0.0.0.0:3000
CODER_ACCESS_URL=http://localhost:3000
CODER_WILDCARD_ACCESS_URL=*.cloudide.localhost:3000

# CloudIDE+ API Keys (Optional for development)
CLOUDIDE_GOOGLE_DRIVE_API_KEY=
CLOUDIDE_FIREBASE_CONFIG=
CLOUDIDE_GEMINI_API_KEY=
CLOUDIDE_ZOHO_SALESIQ_KEY=
CLOUDIDE_CLOUDFLARE_API_TOKEN=
CLOUDFLARE_TUNNEL_TOKEN=

# Development Settings
CLOUDIDE_ENVIRONMENT=development
CLOUDIDE_LOG_LEVEL=debug
CLOUDIDE_TELEMETRY_ENABLED=false

# Security (Development Only)
CODER_DANGEROUS_ALLOW_CORS_REQUESTS=true
CODER_SWAGGER_ENABLE=true
CODER_DEV_MODE=true
CODER_VERBOSE=true
EOF
        echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
        echo -e "${CYAN}📋 Please edit $ENV_FILE to add your API keys${NC}"
    else
        echo -e "${GREEN}✅ Environment file already exists${NC}"
    fi
}

# Build Docker images
build_images() {
    echo -e "${YELLOW}🔨 Building CloudIDE+ Docker images...${NC}"

    # Use Docker Compose to build all images
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker/docker-compose.dev.yml build
    else
        docker compose -f docker/docker-compose.dev.yml build
    fi

    echo -e "${GREEN}✅ Docker images built successfully${NC}"
}

# Start services
start_services() {
    echo -e "${YELLOW}🚀 Starting CloudIDE+ services...${NC}"

    # Start core services first
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker/docker-compose.dev.yml up -d postgres redis
        echo -e "${CYAN}⏳ Waiting for database to be ready...${NC}"
        sleep 10

        # Start main services
        docker-compose -f docker/docker-compose.dev.yml up -d coder-dev frontend-dev extension-dev
    else
        docker compose -f docker/docker-compose.dev.yml up -d postgres redis
        echo -e "${CYAN}⏳ Waiting for database to be ready...${NC}"
        sleep 10

        # Start main services
        docker compose -f docker/docker-compose.dev.yml up -d coder-dev frontend-dev extension-dev
    fi

    echo -e "${GREEN}✅ CloudIDE+ services started${NC}"
}

# Check service health
check_services() {
    echo -e "${YELLOW}🏥 Checking service health...${NC}"

    services=("postgres" "redis" "coder-dev" "frontend-dev" "extension-dev")

    for service in "${services[@]}"; do
        if docker ps --filter "name=cloudide-$service" --filter "status=running" | grep -q "$service"; then
            echo -e "${GREEN}✅ $service is running${NC}"
        else
            echo -e "${RED}❌ $service is not running${NC}"
        fi
    done

    # Check if Coder is accessible
    echo -e "${CYAN}⏳ Checking Coder API accessibility...${NC}"
    sleep 5

    if curl -f -s http://localhost:3000/healthz > /dev/null; then
        echo -e "${GREEN}✅ Coder API is accessible at http://localhost:3000${NC}"
    else
        echo -e "${YELLOW}⚠️  Coder API not yet ready (this is normal, may take a few minutes)${NC}"
    fi
}

# Show service URLs
show_urls() {
    echo -e "\n${PURPLE}🌐 CloudIDE+ Service URLs:${NC}"
    echo -e "${CYAN}┌─────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│ Main Coder Interface:                   │${NC}"
    echo -e "${CYAN}│ http://localhost:3000                   │${NC}"
    echo -e "${CYAN}│                                         │${NC}"
    echo -e "${CYAN}│ Frontend Dev Server:                    │${NC}"
    echo -e "${CYAN}│ http://localhost:8080                   │${NC}"
    echo -e "${CYAN}│                                         │${NC}"
    echo -e "${CYAN}│ Prometheus Monitoring:                  │${NC}"
    echo -e "${CYAN}│ http://localhost:9090                   │${NC}"
    echo -e "${CYAN}│                                         │${NC}"
    echo -e "${CYAN}│ Grafana Dashboard:                      │${NC}"
    echo -e "${CYAN}│ http://localhost:3001                   │${NC}"
    echo -e "${CYAN}│ (admin/admin)                           │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────┘${NC}"
}

# Show logs
show_logs() {
    service=${1:-"coder-dev"}
    echo -e "${YELLOW}📋 Showing logs for $service...${NC}"

    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker/docker-compose.dev.yml logs -f "$service"
    else
        docker compose -f docker/docker-compose.dev.yml logs -f "$service"
    fi
}

# Stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping CloudIDE+ services...${NC}"

    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker/docker-compose.dev.yml down
    else
        docker compose -f docker/docker-compose.dev.yml down
    fi

    echo -e "${GREEN}✅ CloudIDE+ services stopped${NC}"
}

# Clean up everything
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up CloudIDE+ environment...${NC}"

    # Stop and remove containers
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker/docker-compose.dev.yml down -v --remove-orphans
    else
        docker compose -f docker/docker-compose.dev.yml down -v --remove-orphans
    fi

    # Remove images
    echo -e "${YELLOW}🗑️  Removing CloudIDE+ images...${NC}"
    docker images | grep cloudide | awk '{print $3}' | xargs -r docker rmi -f

    # Clean up volumes
    echo -e "${YELLOW}🗑️  Removing volumes...${NC}"
    docker volume ls | grep cloudide | awk '{print $2}' | xargs -r docker volume rm

    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Install development tools
install_dev_tools() {
    echo -e "${YELLOW}🛠️  Installing development tools...${NC}"

    # Create development scripts directory
    mkdir -p scripts/dev-tools

    # Create extension development helper
    cat > scripts/dev-tools/create-extension.sh << 'EOF'
#!/bin/bash
# CloudIDE+ Extension Creation Helper

extension_name=$1
display_name=$2
description=$3

if [ -z "$extension_name" ]; then
    echo "Usage: $0 <extension-name> [display-name] [description]"
    exit 1
fi

echo "🔌 Creating CloudIDE+ extension: $extension_name"

# Start extension dev container and create extension
docker exec -it cloudide-extension-dev cloudide-ext create "$extension_name" "$display_name" "$description"

echo "✅ Extension created! Access the development container:"
echo "docker exec -it cloudide-extension-dev bash"
EOF

    chmod +x scripts/dev-tools/create-extension.sh

    echo -e "${GREEN}✅ Development tools installed${NC}"
}

# Show help
show_help() {
    echo -e "${BLUE}CloudIDE+ Development Setup Helper${NC}"
    echo ""
    echo -e "${YELLOW}Usage: $0 [command]${NC}"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo -e "  ${GREEN}setup${NC}     - Full setup (check, build, start)"
    echo -e "  ${GREEN}build${NC}     - Build Docker images"
    echo -e "  ${GREEN}start${NC}     - Start services"
    echo -e "  ${GREEN}stop${NC}      - Stop services"
    echo -e "  ${GREEN}restart${NC}   - Restart services"
    echo -e "  ${GREEN}status${NC}    - Check service status"
    echo -e "  ${GREEN}logs${NC}      - Show logs [service-name]"
    echo -e "  ${GREEN}shell${NC}     - Access container shell [service-name]"
    echo -e "  ${GREEN}cleanup${NC}   - Remove all containers and images"
    echo -e "  ${GREEN}dev-tools${NC} - Install development tools"
    echo -e "  ${GREEN}help${NC}      - Show this help"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  $0 setup                    # Complete setup"
    echo -e "  $0 logs coder-dev          # Show Coder logs"
    echo -e "  $0 shell extension-dev     # Access extension dev container"
    echo ""
}

# Access container shell
shell_access() {
    service=${1:-"coder-dev"}
    container_name="cloudide-$service"

    echo -e "${YELLOW}🐚 Accessing $service shell...${NC}"

    if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
        docker exec -it "$container_name" bash
    else
        echo -e "${RED}❌ Container $container_name is not running${NC}"
        echo -e "${CYAN}💡 Start services first: $0 start${NC}"
    fi
}

# Main script logic
main() {
    clear
    print_logo

    case "${1:-setup}" in
        "setup")
            check_docker
            check_prerequisites
            create_env_file
            build_images
            start_services
            sleep 5
            check_services
            show_urls
            echo -e "\n${GREEN}🎉 CloudIDE+ development environment is ready!${NC}"
            echo -e "${CYAN}💡 Run '$0 help' for more commands${NC}"
            ;;
        "build")
            check_docker
            build_images
            ;;
        "start")
            check_docker
            start_services
            sleep 5
            check_services
            show_urls
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            start_services
            sleep 5
            check_services
            show_urls
            ;;
        "status")
            check_services
            show_urls
            ;;
        "logs")
            show_logs "$2"
            ;;
        "shell")
            shell_access "$2"
            ;;
        "cleanup")
            read -p "⚠️  This will remove all CloudIDE+ containers and data. Continue? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cleanup
            else
                echo "Cleanup cancelled"
            fi
            ;;
        "dev-tools")
            install_dev_tools
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
