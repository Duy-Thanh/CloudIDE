# CloudIDE+ Quick Start Script for Windows
# Simplified setup for immediate testing and development

param(
    [Parameter(Position=0)]
    [string]$Command = "start",
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColoredText($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

function Write-Title($Text) {
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
}

function Show-Logo {
    Clear-Host
    Write-Host ""
    Write-ColoredText "   _____ _                 _ _____ _____  ______" "Cyan"
    Write-ColoredText "  / ____| |               | |_   _|  __ \|  ____| +" "Cyan"
    Write-ColoredText " | |    | | ___  _   _  __| | | | | |  | | |__   +" "Cyan"
    Write-ColoredText " | |    | |/ _ \| | | |/ _\` | | | | |  | |  __|  +" "Cyan"
    Write-ColoredText " | |____| | (_) | |_| | (_| |_| |_| |__| | |____ +" "Cyan"
    Write-ColoredText "  \_____|_|\___/ \__,_|\__,_|_____|_____/|______| +" "Cyan"
    Write-Host ""
    Write-ColoredText "🚀 CloudIDE+ Quick Start (Windows)" "Blue"
    Write-ColoredText "Simplified setup for immediate development" "Blue"
    Write-Host ""
}

function Test-DockerInstallation {
    Write-Title "🔍 Checking Docker Installation"

    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Write-ColoredText "✅ Docker found: $dockerVersion" "Green"
        } else {
            throw "Docker not found"
        }
    }
    catch {
        Write-ColoredText "❌ Docker is not installed or not running" "Red"
        Write-ColoredText "Please install Docker Desktop from:" "Yellow"
        Write-ColoredText "https://docs.docker.com/desktop/windows/" "Cyan"
        Write-Host ""
        Write-ColoredText "After installation:" "Yellow"
        Write-ColoredText "1. Start Docker Desktop" "White"
        Write-ColoredText "2. Wait for 'Docker Desktop is running' status" "White"
        Write-ColoredText "3. Run this script again" "White"
        exit 1
    }

    try {
        docker info 2>$null | Out-Null
        Write-ColoredText "✅ Docker daemon is running" "Green"
    }
    catch {
        Write-ColoredText "❌ Docker daemon is not running" "Red"
        Write-ColoredText "Please start Docker Desktop and try again" "Yellow"
        exit 1
    }
}

function Start-SimpleEnvironment {
    Write-Title "🚀 Starting CloudIDE+ Simple Environment"

    Write-ColoredText "📁 Using simplified Docker Compose setup..." "Yellow"

    $composeFile = "docker\docker-compose.simple.yml"

    if (-not (Test-Path $composeFile)) {
        Write-ColoredText "❌ Docker Compose file not found: $composeFile" "Red"
        Write-ColoredText "Please ensure you're running this from the cloudide-plus directory" "Yellow"
        exit 1
    }

    try {
        Write-ColoredText "🗄️  Starting PostgreSQL and Redis..." "Cyan"
        docker compose -f $composeFile up -d postgres redis

        Write-ColoredText "⏳ Waiting for databases to initialize..." "Yellow"
        Start-Sleep -Seconds 15

        Write-ColoredText "🖥️  Starting code-server..." "Cyan"
        docker compose -f $composeFile up -d code-server

        Write-ColoredText "🔧 Starting development tools..." "Cyan"
        docker compose -f $composeFile up -d cloudide-dev extension-dev

        Write-ColoredText "✅ CloudIDE+ environment started!" "Green"
    }
    catch {
        Write-ColoredText "❌ Failed to start services: $($_.Exception.Message)" "Red"
        exit 1
    }
}

function Test-Services {
    Write-Title "🏥 Checking Service Status"

    $services = @("postgres", "redis", "code-server", "cloudide-dev-tools", "extension-dev")

    foreach ($service in $services) {
        $containerName = "cloudide-$service"
        if ($service -eq "cloudide-dev-tools") { $containerName = "cloudide-dev-tools" }
        if ($service -eq "extension-dev") { $containerName = "cloudide-extension-dev" }

        $running = docker ps --filter "name=$containerName" --filter "status=running" --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

        if ($running) {
            Write-ColoredText "✅ $service is running" "Green"
        } else {
            Write-ColoredText "❌ $service is not running" "Red"
        }
    }
}

function Show-AccessInfo {
    Write-Title "🌐 Access Your CloudIDE+ Environment"

    Write-Host "┌─────────────────────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│                   SERVICE URLS                          │" -ForegroundColor Cyan
    Write-Host "├─────────────────────────────────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "│                                                         │" -ForegroundColor Cyan
    Write-Host "│  🖥️  VS Code (code-server):                            │" -ForegroundColor White
    Write-Host "│     http://localhost:8080                               │" -ForegroundColor Green
    Write-Host "│     Password: cloudide123                               │" -ForegroundColor Yellow
    Write-Host "│                                                         │" -ForegroundColor Cyan
    Write-Host "│  🗄️  PostgreSQL Database:                              │" -ForegroundColor White
    Write-Host "│     Host: localhost:5432                                │" -ForegroundColor Green
    Write-Host "│     Database: coder                                     │" -ForegroundColor Green
    Write-Host "│     User: coder / Password: coder_dev_password          │" -ForegroundColor Yellow
    Write-Host "│                                                         │" -ForegroundColor Cyan
    Write-Host "│  🔄 Redis Cache:                                        │" -ForegroundColor White
    Write-Host "│     Host: localhost:6379                                │" -ForegroundColor Green
    Write-Host "│                                                         │" -ForegroundColor Cyan
    Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""

    Write-ColoredText "🎯 Next Steps:" "Yellow"
    Write-ColoredText "1. Open http://localhost:8080 in your browser" "White"
    Write-ColoredText "2. Enter password: cloudide123" "White"
    Write-ColoredText "3. Start developing with VS Code in your browser!" "White"
    Write-Host ""

    Write-ColoredText "📚 Useful Commands:" "Yellow"
    Write-ColoredText "  .\scripts\quick-start.ps1 status    - Check service status" "White"
    Write-ColoredText "  .\scripts\quick-start.ps1 logs      - Show logs" "White"
    Write-ColoredText "  .\scripts\quick-start.ps1 stop      - Stop all services" "White"
    Write-ColoredText "  .\scripts\quick-start.ps1 shell     - Access container shell" "White"
}

function Show-Logs {
    param([string]$ServiceName = "code-server")

    Write-Title "📋 Service Logs"

    $composeFile = "docker\docker-compose.simple.yml"

    try {
        Write-ColoredText "Showing logs for: $ServiceName" "Yellow"
        Write-ColoredText "Press Ctrl+C to exit log view" "Cyan"
        Start-Sleep -Seconds 2
        docker compose -f $composeFile logs -f $ServiceName
    }
    catch {
        Write-ColoredText "❌ Failed to show logs: $($_.Exception.Message)" "Red"
    }
}

function Stop-Services {
    Write-Title "🛑 Stopping CloudIDE+ Services"

    $composeFile = "docker\docker-compose.simple.yml"

    try {
        docker compose -f $composeFile down
        Write-ColoredText "✅ All services stopped" "Green"
    }
    catch {
        Write-ColoredText "❌ Failed to stop services: $($_.Exception.Message)" "Red"
    }
}

function Enter-ContainerShell {
    param([string]$ServiceName = "cloudide-dev-tools")

    Write-Title "🐚 Container Shell Access"

    $containerName = "cloudide-dev-tools"
    if ($ServiceName -eq "extension") { $containerName = "cloudide-extension-dev" }
    if ($ServiceName -eq "code-server") { $containerName = "cloudide-code-server" }

    $running = docker ps --filter "name=$containerName" --filter "status=running" --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

    if ($running) {
        Write-ColoredText "🔓 Accessing $containerName shell..." "Yellow"
        Write-ColoredText "Type 'exit' to return to Windows" "Cyan"
        docker exec -it $containerName bash
    } else {
        Write-ColoredText "❌ Container $containerName is not running" "Red"
        Write-ColoredText "💡 Start services first: .\scripts\quick-start.ps1 start" "Yellow"
    }
}

function Show-Help {
    Write-Title "📖 CloudIDE+ Quick Start Help"

    Write-ColoredText "Usage:" "Yellow"
    Write-ColoredText "  .\scripts\quick-start.ps1 [command] [service]" "White"
    Write-Host ""

    Write-ColoredText "Commands:" "Cyan"
    Write-ColoredText "  start       - Start the CloudIDE+ environment (default)" "Green"
    Write-ColoredText "  stop        - Stop all services" "Green"
    Write-ColoredText "  status      - Check service health" "Green"
    Write-ColoredText "  logs        - Show service logs [service-name]" "Green"
    Write-ColoredText "  shell       - Access container shell [service-name]" "Green"
    Write-ColoredText "  restart     - Restart all services" "Green"
    Write-ColoredText "  help        - Show this help" "Green"
    Write-Host ""

    Write-ColoredText "Examples:" "Cyan"
    Write-ColoredText "  .\scripts\quick-start.ps1                     # Start environment" "White"
    Write-ColoredText "  .\scripts\quick-start.ps1 logs code-server    # Show VS Code logs" "White"
    Write-ColoredText "  .\scripts\quick-start.ps1 shell extension     # Access extension dev" "White"
    Write-Host ""

    Write-ColoredText "Services:" "Cyan"
    Write-ColoredText "  code-server    - VS Code web interface" "White"
    Write-ColoredText "  postgres       - PostgreSQL database" "White"
    Write-ColoredText "  redis          - Redis cache" "White"
    Write-ColoredText "  cloudide-dev   - Development tools" "White"
    Write-ColoredText "  extension      - Extension development" "White"
}

function Test-WebAccess {
    Write-ColoredText "🌐 Testing web access..." "Yellow"

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 302) {
            Write-ColoredText "✅ VS Code is accessible at http://localhost:8080" "Green"
        } else {
            Write-ColoredText "⚠️  VS Code may still be starting up..." "Yellow"
        }
    }
    catch {
        Write-ColoredText "⚠️  VS Code not yet ready (this is normal for first start)" "Yellow"
    }
}

# Main execution
Show-Logo

switch ($Command.ToLower()) {
    "start" {
        Test-DockerInstallation
        Start-SimpleEnvironment
        Start-Sleep -Seconds 10
        Test-Services
        Test-WebAccess
        Show-AccessInfo
    }
    "stop" {
        Stop-Services
    }
    "status" {
        Test-Services
        Show-AccessInfo
    }
    "logs" {
        Show-Logs -ServiceName $Service
    }
    "shell" {
        Enter-ContainerShell -ServiceName $Service
    }
    "restart" {
        Stop-Services
        Start-Sleep -Seconds 3
        Start-SimpleEnvironment
        Start-Sleep -Seconds 10
        Test-Services
        Show-AccessInfo
    }
    "help" {
        Show-Help
    }
    default {
        Write-ColoredText "❌ Unknown command: $Command" "Red"
        Show-Help
        exit 1
    }
}
