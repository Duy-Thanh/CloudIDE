@echo off
REM CloudIDE+ Development Environment Startup Script (Batch)
REM Run this script to start your development environment on Day 1-2

setlocal enabledelayedexpansion

echo.
echo 🚀 CloudIDE+ Development Environment
echo ====================================
echo.

REM Parse command line arguments
if "%1"=="--stop" goto stop
if "%1"=="--reset" goto reset
if "%1"=="--status" goto status
if "%1"=="--logs" goto logs
if "%1"=="--help" goto help

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Change to script directory
cd /d "%~dp0"

echo 🔧 Starting CloudIDE+ development environment...

REM Check if .env exists, if not copy from .env.dev
if not exist ".env" (
    echo 📝 Creating .env file from .env.dev...
    copy ".env.dev" ".env" >nul
    echo ✅ .env file created. You can customize it as needed.
)

REM Start the services
echo 🐳 Starting Docker containers...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service status
echo.
echo 📊 Service Status:
docker-compose -f docker-compose.dev.yml ps

echo.
echo 🎉 CloudIDE+ Development Environment is ready!
echo.
echo 🔗 Access URLs:
echo    📊 Coder Dashboard: http://localhost:7080
echo    🗄️  Database: localhost:5432
echo.
echo 📚 Next Steps:
echo    1. Open http://localhost:7080 in your browser
echo    2. Follow the Coder setup wizard
echo    3. Create your first workspace template
echo    4. Start developing your VS Code extensions!
echo.
echo 🛠️  Quick Commands:
echo    start-dev.bat --status    # Check service status
echo    start-dev.bat --logs      # View logs
echo    start-dev.bat --stop      # Stop environment
echo    start-dev.bat --reset     # Reset everything
echo    start-dev.bat --help      # Show help
echo.
echo 📖 For detailed setup instructions, see SETUP.md
echo.
pause
exit /b 0

:stop
echo 🛑 Stopping CloudIDE+ development environment...
docker-compose -f docker-compose.dev.yml down
echo ✅ Environment stopped.
pause
exit /b 0

:reset
echo 🔄 Resetting CloudIDE+ development environment...
docker-compose -f docker-compose.dev.yml down -v
docker volume prune -f
echo ✅ Environment reset. All data removed.
echo Run the script again to start fresh.
pause
exit /b 0

:status
echo 📊 CloudIDE+ Environment Status:
docker-compose -f docker-compose.dev.yml ps
echo.
echo 🔗 Access URLs:
echo    Coder Dashboard: http://localhost:7080
echo    Database: localhost:5432
pause
exit /b 0

:logs
echo 📋 Following logs (Ctrl+C to exit)...
docker-compose -f docker-compose.dev.yml logs -f
exit /b 0

:help
echo CloudIDE+ Development Environment
echo =================================
echo.
echo Usage: start-dev.bat [option]
echo.
echo Options:
echo   (none)     Start the development environment
echo   --stop     Stop the development environment
echo   --reset    Reset environment (removes all data)
echo   --status   Show service status
echo   --logs     Show and follow logs
echo   --help     Show this help message
echo.
echo For detailed setup instructions, see SETUP.md
pause
exit /b 0
