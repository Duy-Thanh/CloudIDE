# CloudIDE+ Development Setup Script (PowerShell)
# Automates the setup and management of CloudIDE+ development environment on Windows

param(
    [Parameter(Position=0)]
    [string]$Command = "setup",
    [Parameter(Position=1)]
    [string]$ServiceName = ""
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    Cyan = "Cyan"
    White = "White"
}

# CloudIDE+ ASCII Art
function Show-Logo {
    Write-Host ""
    Write-Host "   _____ _                 _ _____ _____  ______" -ForegroundColor Cyan
    Write-Host "  / ____| |               | |_   _|  __ \|  ____|_" -ForegroundColor Cyan
    Write-Host " | |    | | ___  _   _  __| | | | | |  | | |__  _| |_" -ForegroundColor Cyan
    Write-Host " | |    | |/ _ \| | | |/ _\` | | | | |  | |  __||_   _|" -ForegroundColor Cyan
    Write-Host " | |____| | (_) | |_| | (_| |_| |_| |__| | |____ |_|" -ForegroundColor Cyan
    Write-Host "  \_____|_|\___/ \__,_|\__,_|_____|_____/|______|" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 CloudIDE+ Development Environment Setup" -ForegroundColor Blue
    Write-Host "Building the Future of Cloud Development" -ForegroundColor Blue
    Write-Host ""
}

# Check if Docker is installed and running
function Test-Docker {
    Write-Host "🔍 Checking Docker installation..." -ForegroundColor Yellow

    # Check if Docker command exists
    try {
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            throw "Docker command not found"
        }
    }
    catch {
        Write-Host "❌ Docker is not installed" -ForegroundColor Red
        Write-Host "Please install Docker Desktop from: https://docs.docker.com/desktop/windows/" -ForegroundColor Yellow
        exit 1
    }

    # Check if Docker daemon is running
    try {
        docker info 2>$null | Out-Null
    }
    catch {
        Write-Host "❌ Docker daemon is not running" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
        exit 1
    }

    # Check Docker Compose
    try {
        $composeVersion = docker compose version 2>$null
        if (-not $composeVersion) {
            $composeVersion = docker-compose --version 2>$null
            if (-not $composeVersion) {
                throw "Docker Compose not found"
            }
        }
    }
    catch {
        Write-Host "❌ Docker Compose is not available" -ForegroundColor Red
        Write-Host "Please install Docker Compose" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✅ Docker is ready" -ForegroundColor Green
}

# Check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Node.js not found. Installing via container..." -ForegroundColor Yellow
    }

    # Check Git
    try {
        $gitVersion = git --version 2>$null
        if ($gitVersion) {
            Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
        }
        else {
            throw "Git not found"
        }
    }
    catch {
        Write-Host "❌ Git is required but not installed" -ForegroundColor Red
        Write-Host "Please install Git from: https://git-scm.com/download/windows" -ForegroundColor Yellow
        exit 1
    }

    # Check available disk space (minimum 10GB)
    $drive = Get-PSDrive -Name (Get-Location).Drive.Name
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)

    if ($freeSpaceGB -lt 10) {
        Write-Host "⚠️  Low disk space. CloudIDE+ requires at least 10GB (Available: ${freeSpaceGB}GB)" -ForegroundColor Yellow
    }
    else {
        Write-Host "✅ Sufficient disk space available (${freeSpaceGB}GB free)" -ForegroundColor Green
    }

    # Check Windows version
    $winVersion = [System.Environment]::OSVersion.Version
    if ($winVersion.Major -ge 10) {
        Write-Host "✅ Windows version: $($winVersion.Major).$($winVersion.Minor)" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Older Windows version detected. Some features may not work properly" -ForegroundColor Yellow
    }
}

# Create environment file
function New-EnvironmentFile {
    Write-Host "📝 Creating environment configuration..." -ForegroundColor Yellow

    $envFile = ".env.development"

    if (-not (Test-Path $envFile)) {
        $envContent = @"
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
"@

        $envContent | Out-File -FilePath $envFile -Encoding UTF8
        Write-Host "✅ Created $envFile" -ForegroundColor Green
        Write-Host "📋 Please edit $envFile to add your API keys" -ForegroundColor Cyan
    }
    else {
        Write-Host "✅ Environment file already exists" -ForegroundColor Green
    }
}

# Build Docker images
function Build-Images {
    Write-Host "🔨 Building CloudIDE+ Docker images..." -ForegroundColor Yellow

    try {
        # Try docker compose first, then fall back to docker-compose
        if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            try {
                docker compose -f docker/docker-compose.dev.yml build
            }
            catch {
                docker-compose -f docker/docker-compose.dev.yml build
            }
        }
        Write-Host "✅ Docker images built successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to build Docker images: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Start services
function Start-Services {
    Write-Host "🚀 Starting CloudIDE+ services..." -ForegroundColor Yellow

    try {
        # Start core services first
        try {
            docker compose -f docker/docker-compose.dev.yml up -d postgres redis
        }
        catch {
            docker-compose -f docker/docker-compose.dev.yml up -d postgres redis
        }

        Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10

        # Start main services
        try {
            docker compose -f docker/docker-compose.dev.yml up -d coder-dev frontend-dev extension-dev
        }
        catch {
            docker-compose -f docker/docker-compose.dev.yml up -d coder-dev frontend-dev extension-dev
        }

        Write-Host "✅ CloudIDE+ services started" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to start services: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Check service health
function Test-Services {
    Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

    $services = @("postgres", "redis", "coder-dev", "frontend-dev", "extension-dev")

    foreach ($service in $services) {
        $containerName = "cloudide-$service"
        $running = docker ps --filter "name=$containerName" --filter "status=running" --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

        if ($running) {
            Write-Host "✅ $service is running" -ForegroundColor Green
        }
        else {
            Write-Host "❌ $service is not running" -ForegroundColor Red
        }
    }

    # Check if Coder is accessible
    Write-Host "⏳ Checking Coder API accessibility..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/healthz" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Coder API is accessible at http://localhost:3000" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  Coder API not yet ready (this is normal, may take a few minutes)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "⚠️  Coder API not yet ready (this is normal, may take a few minutes)" -ForegroundColor Yellow
    }
}

# Show service URLs
function Show-ServiceUrls {
    Write-Host ""
    Write-Host "🌐 CloudIDE+ Service URLs:" -ForegroundColor Magenta
    Write-Host "┌─────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│ Main Coder Interface:                   │" -ForegroundColor Cyan
    Write-Host "│ http://localhost:3000                   │" -ForegroundColor Cyan
    Write-Host "│                                         │" -ForegroundColor Cyan
    Write-Host "│ Frontend Dev Server:                    │" -ForegroundColor Cyan
    Write-Host "│ http://localhost:8080                   │" -ForegroundColor Cyan
    Write-Host "│                                         │" -ForegroundColor Cyan
    Write-Host "│ Prometheus Monitoring:                  │" -ForegroundColor Cyan
    Write-Host "│ http://localhost:9090                   │" -ForegroundColor Cyan
    Write-Host "│                                         │" -ForegroundColor Cyan
    Write-Host "│ Grafana Dashboard:                      │" -ForegroundColor Cyan
    Write-Host "│ http://localhost:3001                   │" -ForegroundColor Cyan
    Write-Host "│ (admin/admin)                           │" -ForegroundColor Cyan
    Write-Host "└─────────────────────────────────────────┘" -ForegroundColor Cyan
}

# Show logs
function Show-Logs {
    param([string]$ServiceName = "coder-dev")

    Write-Host "📋 Showing logs for $ServiceName..." -ForegroundColor Yellow

    try {
        docker compose -f docker/docker-compose.dev.yml logs -f $ServiceName
    }
    catch {
        docker-compose -f docker/docker-compose.dev.yml logs -f $ServiceName
    }
}

# Stop services
function Stop-Services {
    Write-Host "🛑 Stopping CloudIDE+ services..." -ForegroundColor Yellow

    try {
        try {
            docker compose -f docker/docker-compose.dev.yml down
        }
        catch {
            docker-compose -f docker/docker-compose.dev.yml down
        }
        Write-Host "✅ CloudIDE+ services stopped" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to stop services: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Clean up everything
function Remove-Environment {
    Write-Host "🧹 Cleaning up CloudIDE+ environment..." -ForegroundColor Yellow

    $confirm = Read-Host "⚠️  This will remove all CloudIDE+ containers and data. Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cleanup cancelled" -ForegroundColor Yellow
        return
    }

    try {
        # Stop and remove containers
        try {
            docker compose -f docker/docker-compose.dev.yml down -v --remove-orphans
        }
        catch {
            docker-compose -f docker/docker-compose.dev.yml down -v --remove-orphans
        }

        # Remove images
        Write-Host "🗑️  Removing CloudIDE+ images..." -ForegroundColor Yellow
        $images = docker images --filter "reference=*cloudide*" --format "{{.ID}}"
        if ($images) {
            docker rmi -f $images
        }

        # Clean up volumes
        Write-Host "🗑️  Removing volumes..." -ForegroundColor Yellow
        $volumes = docker volume ls --filter "name=cloudide" --format "{{.Name}}"
        if ($volumes) {
            docker volume rm $volumes
        }

        Write-Host "✅ Cleanup completed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error during cleanup: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Install development tools
function Install-DevTools {
    Write-Host "🛠️  Installing development tools..." -ForegroundColor Yellow

    # Create development scripts directory
    if (-not (Test-Path "scripts\dev-tools")) {
        New-Item -ItemType Directory -Path "scripts\dev-tools" -Force | Out-Null
    }

    # Create extension development helper
    $extensionScript = @"
# CloudIDE+ Extension Creation Helper (PowerShell)
param(
    [Parameter(Mandatory=`$true)]
    [string]`$ExtensionName,
    [string]`$DisplayName = "",
    [string]`$Description = ""
)

if (-not `$ExtensionName) {
    Write-Host "Usage: .\create-extension.ps1 -ExtensionName <name> [-DisplayName <display>] [-Description <desc>]"
    exit 1
}

Write-Host "🔌 Creating CloudIDE+ extension: `$ExtensionName"

# Start extension dev container and create extension
docker exec -it cloudide-extension-dev cloudide-ext create "`$ExtensionName" "`$DisplayName" "`$Description"

Write-Host "✅ Extension created! Access the development container:"
Write-Host "docker exec -it cloudide-extension-dev bash"
"@

    $extensionScript | Out-File -FilePath "scripts\dev-tools\create-extension.ps1" -Encoding UTF8

    Write-Host "✅ Development tools installed" -ForegroundColor Green
}

# Show help
function Show-Help {
    Write-Host "CloudIDE+ Development Setup Helper (PowerShell)" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\dev-setup.ps1 [command] [service-name]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  setup       - Full setup (check, build, start)" -ForegroundColor Green
    Write-Host "  build       - Build Docker images" -ForegroundColor Green
    Write-Host "  start       - Start services" -ForegroundColor Green
    Write-Host "  stop        - Stop services" -ForegroundColor Green
    Write-Host "  restart     - Restart services" -ForegroundColor Green
    Write-Host "  status      - Check service status" -ForegroundColor Green
    Write-Host "  logs        - Show logs [service-name]" -ForegroundColor Green
    Write-Host "  shell       - Access container shell [service-name]" -ForegroundColor Green
    Write-Host "  cleanup     - Remove all containers and images" -ForegroundColor Green
    Write-Host "  dev-tools   - Install development tools" -ForegroundColor Green
    Write-Host "  help        - Show this help" -ForegroundColor Green
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\dev-setup.ps1 setup                    # Complete setup"
    Write-Host "  .\dev-setup.ps1 logs coder-dev          # Show Coder logs"
    Write-Host "  .\dev-setup.ps1 shell extension-dev     # Access extension dev container"
    Write-Host ""
}

# Access container shell
function Enter-ContainerShell {
    param([string]$ServiceName = "coder-dev")

    $containerName = "cloudide-$ServiceName"

    Write-Host "🐚 Accessing $ServiceName shell..." -ForegroundColor Yellow

    $running = docker ps --filter "name=$containerName" --filter "status=running" --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

    if ($running) {
        docker exec -it $containerName bash
    }
    else {
        Write-Host "❌ Container $containerName is not running" -ForegroundColor Red
        Write-Host "💡 Start services first: .\dev-setup.ps1 start" -ForegroundColor Cyan
    }
}

# Main script logic
function Main {
    Clear-Host
    Show-Logo

    switch ($Command.ToLower()) {
        "setup" {
            Test-Docker
            Test-Prerequisites
            New-EnvironmentFile
            Build-Images
            Start-Services
            Start-Sleep -Seconds 5
            Test-Services
            Show-ServiceUrls
            Write-Host ""
            Write-Host "🎉 CloudIDE+ development environment is ready!" -ForegroundColor Green
            Write-Host "💡 Run '.\dev-setup.ps1 help' for more commands" -ForegroundColor Cyan
        }
        "build" {
            Test-Docker
            Build-Images
        }
        "start" {
            Test-Docker
            Start-Services
            Start-Sleep -Seconds 5
            Test-Services
            Show-ServiceUrls
        }
        "stop" {
            Stop-Services
        }
        "restart" {
            Stop-Services
            Start-Sleep -Seconds 2
            Start-Services
            Start-Sleep -Seconds 5
            Test-Services
            Show-ServiceUrls
        }
        "status" {
            Test-Services
            Show-ServiceUrls
        }
        "logs" {
            Show-Logs -ServiceName $ServiceName
        }
        "shell" {
            Enter-ContainerShell -ServiceName $ServiceName
        }
        "cleanup" {
            Remove-Environment
        }
        "dev-tools" {
            Install-DevTools
        }
        "help" {
            Show-Help
        }
        default {
            Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
}

# Run main function
Main
