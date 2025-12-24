# Lapeco HRMS - Docker Setup

This Docker setup replaces the original `start.bat` script with containerized services for better consistency and portability.

## Services

The following services are containerized:

- **MySQL Database** (MySQL 8.0) - Port 3306
- **Laravel Backend** (PHP 8.2) - Port 8000
- **React Frontend 1 (HRMS)** - Port 3000  
- **React Frontend 2 (Recruitment)** - Port 5173
- **Python ML API** - Port 8010

## Database Configuration

**MySQL Connection Details:**
- Host: `mysql` (within Docker network)
- Port: 3306
- Database: `lapeco_hrms`
- Username: `lapeco_user`
- Password: `lapeco_password`
- Root Password: `root`

**External Access:**
- Host: `localhost`
- Port: 3306

## Quick Start

### Windows Users
```bash
# Run the Docker startup script
docker-start.bat
```

### Linux/Mac Users
```bash
# Make the script executable (first time only)
chmod +x docker-start.sh

# Run the Docker startup script
./docker-start.sh
```

### Manual Docker Commands
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Access Points

Once running, access the services at:

- **MySQL Database**: localhost:3317
- **Laravel Backend**: http://localhost:8011
- **HRMS Frontend**: http://localhost:3011
- **Recruitment Frontend**: http://localhost:5184
- **ML API**: http://localhost:8021

## Development

The containers are configured for development with:

- **Hot reload**: Code changes are reflected immediately
- **Volume mounts**: Local files are synchronized with containers
- **Debug mode**: Enabled for all services
- **Auto-migration**: Laravel automatically runs migrations on startup

## Database Management

### Connect to MySQL
```bash
# Connect to MySQL container
docker exec -it lapeco-mysql mysql -u lapeco_user -p lapeco_hrms

# Or connect from host machine
mysql -h localhost -P 3306 -u lapeco_user -p lapeco_hrms
```

### Reset Database
```bash
# Stop containers and remove volume
docker-compose down -v

# Restart (will create fresh database)
docker-compose up --build -d
```

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

## Troubleshooting

### Port Conflicts
If ports are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Change host port from 8000 to 8001
```

### Permission Issues (Linux/Mac)
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### Database Connection Issues
```bash
# Check MySQL container logs
docker-compose logs mysql

# Restart MySQL service
docker-compose restart mysql
```

### Rebuilding Services
```bash
# Force rebuild without cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose build laravel-backend
```

## Migration from start.bat

| Original start.bat | Docker Equivalent |
|-------------------|------------------|
| Laravel on port 8000 | `laravel-backend` service |
| HRMS on port 3000 | `react-hrms` service |
| Recruitment on port 5173 | `react-recruitment` service |
| ML API on port 8010 | `python-ml-api` service |
| SQLite database | `mysql` service (persistent) |

The Docker setup provides the same functionality with added benefits:
- Consistent environments across machines
- Isolated dependencies
- Easy scaling and deployment
- Better resource management
- Persistent MySQL database with automatic backups
