# ---- Base image ----
FROM php:8.2-fpm

# ---- System dependencies ----
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    default-libmysqlclient-dev \
    && docker-php-ext-install \
        pdo_mysql \
        zip \
        bcmath \
        mbstring \
        xml \
        ctype \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ---- Install Composer ----
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# ---- Set working directory ----
WORKDIR /var/www/html

# ---- Copy application code ----
COPY --chown=www-data:www-data . /var/www/html

# ---- Install PHP dependencies ----
RUN composer install --no-dev --optimize-autoloader

# ---- Permissions for storage and cache ----
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chmod -R 775 storage bootstrap/cache

# ---- Copy startup script ----
COPY start.sh /start.sh
RUN chmod +x /start.sh

# ---- Expose port for artisan serve ----
EXPOSE 8000

# ---- Start application ----
CMD ["/start.sh"]
