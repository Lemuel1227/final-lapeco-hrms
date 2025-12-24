# Use Python 3.12 slim image
FROM python:3.12-slim

# Install locale and system dependencies
RUN apt-get update && apt-get install -y \
    locales \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && locale-gen C.UTF-8 \
    && update-locale C.UTF-8

# Set locale environment variables
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONIOENCODING=UTF-8

# Set working directory
WORKDIR /app

# Copy requirements first (for better Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --timeout=600 -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY start.py .

# Copy models
COPY models/ ./models/

# Expose port
EXPOSE 8010

# Set environment variables
ENV PYTHONPATH=/app

# Run the application
CMD ["python", "start.py"]
