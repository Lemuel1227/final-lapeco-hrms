#!/bin/bash

# Wait for MySQL to be ready
set -e

until php -r "
try {
    new PDO(
        'mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_DATABASE'),
        getenv('DB_USERNAME'),
        getenv('DB_PASSWORD'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    exit(0);
} catch (Throwable \$e) {
    exit(1);
}
" >/dev/null 2>&1; do
  echo "MySQL is unavailable - sleeping 3s..."
  sleep 3
done

echo "✅ MySQL is ready!"

# Create storage link
if [ ! -L public/storage ]; then
  echo "Creating storage symlink"
  php artisan storage:link
fi

# Run database migrations
echo "Running migrations"
php artisan migrate --force

if [ ! -f storage/.seeded ]; then
  echo "Seeding database"
  php -d memory_limit=1024M artisan db:seed --force
  touch storage/.seeded
else
  echo "Database already seeded"
fi

# Cache configuration for production
echo "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run all scheduled commands once (regardless of schedule time)
echo "Running all scheduled tasks..."
if [ ! -f storage/.bootstrap_done ]; then
  echo "First deployment detected"

  php artisan attendance:check-rates || true
  php artisan holidays:notify-upcoming --days=3 || true
  php artisan resignations:deactivate || true
  php artisan training:update-progress || true
  php artisan leave:auto-decline-pending || true

  touch storage/.bootstrap_done
else
  echo "Bootstrap already done"
fi

# Clear all caches
echo "Clearing Laravel caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Start the application
echo "Starting Laravel server..."
php artisan serve --host=0.0.0.0 --port=8000 --no-reload

echo "Starting scheduler..."
while true; do
    php artisan schedule:run
    sleep 60
done
