#!/bin/bash

echo "Starting Lapeco System with Docker..."
echo.

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start all services
echo "Building and starting all services..."
docker-compose up --build -d

echo.
echo "All services are starting..."
echo "Backend will be available at: http://localhost:8011"
echo "Frontend 1 (HRMS) will be available at: http://localhost:3011"
echo "Frontend 2 (Recruitment) will be available at: http://localhost:5184"
echo "Python ML API will be available at: http://localhost:8021"
echo.

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Show running containers
echo "Running containers:"
docker-compose ps

echo.
echo "To view logs, run: docker-compose logs -f"
echo "To stop all services, run: docker-compose down"
echo.
