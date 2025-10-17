@echo off
echo Starting Lapeco System...
echo.
echo Starting Laravel Backend...
start "Laravel Backend" cmd /k "cd lapeco-hrms && php artisan serve"
echo.
echo Starting React Frontend 1 (HRMS)...
start "React Frontend 1 (HRMS)" cmd /k "cd lapeco-hrms\frontend && npm run dev"
echo.
echo Starting React Frontend 2 (Recruitment)...
start "React Frontend 2 (Recruitment)" cmd /k "cd Recr_LAPECO && npm run dev"
echo.
echo All services are starting...
echo Backend will be available at: http://localhost:8000
echo Frontend 1 (HRMS) will be available at: http://localhost:3000
echo Frontend 2 (Recruitment) will be available at: http://localhost:5173
echo.
pause
