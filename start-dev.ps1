# CloudIDE+ Development Environment Startup Script
# Run this script to start your development environment on Day 1-2

param(
    [switch]$Reset,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Logs
)

Write-Host "🚀 CloudIDE+ Development Environment" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Handle different operations
if ($Stop) {
    Write-Host "🛑 Stopping CloudIDE+ development environment..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml down
    Write-Host "✅ Environment stopped." -ForegroundColor Green
    exit 0
}

if ($Reset) {
    Write-Host "🔄 Resetting CloudIDE+ development environment..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml down -v
    docker volume prune -f
    Write-Host "✅ Environment reset. All data removed." -ForegroundColor Green
    Write-Host "Run the script again to start fresh." -ForegroundColor Cyan
    exit 0
}

if ($Status) {
    Write-Host "📊 CloudIDE+ Environment Status:" -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml ps
    Write-Host ""
    Write-Host "🔗 Access URLs:" -ForegroundColor Green
    Write-Host "   Coder Dashboard: http://localhost:7080" -ForegroundColor White
    Write-Host "   Database: localhost:5432" -ForegroundColor White
    exit 0
}

if ($Logs) {
    Write-Host "📋 Following logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml logs -f
    exit 0
}

# Default: Start the environment
Write-Host "🔧 Starting CloudIDE+ development environment..." -ForegroundColor Green

# Check if .env exists, if not copy from .env.dev
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from .env.dev..." -ForegroundColor Yellow
    Copy-Item ".env.dev" ".env"
    Write-Host "✅ .env file created. You can customize it as needed." -ForegroundColor Green
}

# Start the services
Write-Host "🐳 Starting Docker containers..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Green
docker-compose -f docker-compose.dev.yml ps

Write-Host ""
Write-Host "🎉 CloudIDE+ Development Environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Access URLs:" -ForegroundColor Cyan
Write-Host "   📊 Coder Dashboard: http://localhost:7080" -ForegroundColor White
Write-Host "   🗄️  Database: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open http://localhost:7080 in your browser" -ForegroundColor White
Write-Host "   2. Follow the Coder setup wizard" -ForegroundColor White
Write-Host "   3. Create your first workspace template" -ForegroundColor White
Write-Host "   4. Start developing your VS Code extensions!" -ForegroundColor White
Write-Host ""
Write-Host "🛠️  Quick Commands:" -ForegroundColor Cyan
Write-Host "   .\start-dev.ps1 -Status    # Check service status" -ForegroundColor White
Write-Host "   .\start-dev.ps1 -Logs     # View logs" -ForegroundColor White
Write-Host "   .\start-dev.ps1 -Stop     # Stop environment" -ForegroundColor White
Write-Host "   .\start-dev.ps1 -Reset    # Reset everything" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed setup instructions, see SETUP.md" -ForegroundColor Gray
