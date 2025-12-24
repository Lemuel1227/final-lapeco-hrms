@echo off
echo Starting Lapeco System with Docker...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Stop any existing containers
echo Stopping existing containers...
docker-compose down

REM Build and start all services
echo Building and starting all services...
docker-compose up --build -d

echo.
echo All services are starting...
echo Backend will be available at: http://localhost:8011
echo Frontend 1 (HRMS) will be available at: http://localhost:3011
echo Frontend 2 (Recruitment) will be available at: http://localhost:5184
echo Python ML API will be available at: http://localhost:8021
echo.

REM Wait for services to be ready
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Show running containers
echo Running containers:
docker-compose ps

echo.
echo To view logs, run: docker-compose logs -f
echo To stop all services, run: docker-compose down
echo.
pause
