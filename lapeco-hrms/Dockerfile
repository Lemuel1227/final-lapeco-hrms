FROM php:8.2.12-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    libpq-dev \
    default-libmysqlclient-dev \
    && docker-php-ext-install pdo_mysql \
    && docker-php-ext-install mysqli \
    && docker-php-ext-install zip \
    && docker-php-ext-install bcmath \
    && docker-php-ext-install mbstring \
    && docker-php-ext-install xml \
    && docker-php-ext-install ctype

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy existing application directory permissions
COPY --chown=www-data:www-data . /var/www/html

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Create storage directories and set permissions
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Copy environment file
RUN cp .env.example .env

# Generate application key
RUN php artisan key:generate

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port
EXPOSE 8000

# Start the application
CMD ["/start.sh"]
