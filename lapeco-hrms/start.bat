@echo off
echo Starting Lapeco System...
echo.
echo Starting Laravel Backend...
start "Laravel Backend" cmd /k "php artisan serve"
echo.
echo Starting React Frontend...
start "React Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Both services are starting...
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo.
pause
