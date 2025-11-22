# ActivityPass Deployment Guide for 1Panel

This guide will help you deploy the ActivityPass application to a server using 1Panel, a modern server management panel that supports Docker container deployments.

## Prerequisites

Before deploying, ensure your server has:

1. **1Panel Installed**: 1Panel server management panel
2. **Docker & Docker Compose**: Container runtime and orchestration
3. **Domain Name**: Pointed to your server IP (optional but recommended)
4. **SSL Certificate**: For HTTPS (can be obtained via 1Panel)

## Quick Deployment

### Step 1: Prepare Your Server

1. **Install 1Panel** on your server if not already installed:

   ```bash
   # Ubuntu/Debian
   curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && sh quick_start.sh

   # CentOS/RHEL
   curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && bash quick_start.sh
   ```

2. **Access 1Panel** via your browser at `http://your-server-ip:9999`

3. **Install Docker** through 1Panel's App Store if not already installed

### Step 2: Upload Project Files

1. **Clone or upload** the ActivityPass project to your server:

   ```bash
   git clone https://github.com/Al-rimi/ActivityPass.git
   cd ActivityPass
   ```

2. **Configure environment**:
   ```bash
   cp .env.docker .env
   nano .env  # Edit with your production settings
   ```

### Step 3: Deploy with 1Panel

#### Option A: Using 1Panel's Docker Compose Manager

1. **Open 1Panel** and go to **Container** → **Compose**

2. **Create new compose project**:

   - Name: `activitypass`
   - Path: `/path/to/your/ActivityPass/folder`
   - Docker Compose file: `docker-compose.yml`

3. **Deploy** the stack

#### Option B: Using the Deployment Script

1. **Run the deployment script**:

   ```bash
   # For Linux/Mac
   ./deploy.sh

   # For Windows (PowerShell)
   .\deploy.ps1
   ```

2. **Monitor deployment**:

   ```bash
   # Check service status
   docker compose ps

   # View logs
   docker compose logs -f
   ```

## Environment Configuration

Edit the `.env` file with your production settings:

```env
# Database Configuration
DB_ROOT_PASSWORD=your-secure-root-password
DB_NAME=activitypass
DB_USER=activitypass
DB_PASSWORD=your-secure-db-password

# Django Configuration
DJANGO_SECRET_KEY=your-super-secret-key-change-this-in-production
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# CORS Configuration
CORS_ALLOW_ALL=false

# Frontend Configuration
REACT_APP_API_URL=https://your-domain.com/api
VITE_AMAP_KEY=your-amap-api-key
```

## SSL/HTTPS Setup

### Using 1Panel's SSL Manager

1. **Go to** 1Panel → **Website** → **SSL**

2. **Add SSL certificate**:

   - Domain: `your-domain.com`
   - Type: Let's Encrypt (free) or Manual upload

3. **Configure reverse proxy** in 1Panel to use HTTPS

### Manual SSL Setup

1. **Obtain SSL certificate** (Let's Encrypt recommended)

2. **Place certificates** in `nginx/ssl/`:

   ```
   nginx/ssl/cert.pem  # Your certificate
   nginx/ssl/key.pem   # Your private key
   ```

3. **Enable production profile**:
   ```bash
   docker compose --profile production up -d
   ```

## Domain Configuration

### Using 1Panel's Website Manager

1. **Go to** 1Panel → **Website**

2. **Create new website**:

   - Domain: `your-domain.com`
   - Root directory: `/usr/share/nginx/html` (for frontend)
   - Reverse proxy: `http://127.0.0.1:8000` (for API)

3. **Configure SSL** for the domain

### Manual Domain Setup

1. **Point your domain** to your server IP

2. **Update nginx configuration** in `nginx/nginx.conf`:

   ```nginx
   server_name your-domain.com www.your-domain.com;
   ```

3. **Restart services**:
   ```bash
   docker compose restart nginx
   ```

## Database Management

### Backup Database

```bash
# Create backup
docker exec activitypass_db mysqldump -u root -p activitypass > backup.sql

# Restore backup
docker exec -i activitypass_db mysql -u root -p activitypass < backup.sql
```

### Access Database

```bash
# Connect to database container
docker exec -it activitypass_db mysql -u activitypass -p activitypass
```

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
docker compose down
docker compose build --no-cache
docker compose up -d

# Or use deployment script
./deploy.sh update
```

### Scale Services

```bash
# Scale backend instances
docker compose up -d --scale backend=3

# Scale frontend instances
docker compose up -d --scale frontend=2
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:

   ```bash
   # Check what's using ports
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8000

   # Change ports in docker-compose.yml
   ```

2. **Database connection issues**:

   ```bash
   # Check database logs
   docker compose logs db

   # Test database connection
   docker exec activitypass_db mysqladmin ping -h localhost
   ```

3. **Permission issues**:

   ```bash
   # Fix file permissions
   sudo chown -R 1000:1000 .
   ```

4. **Memory issues**:

   ```bash
   # Check container resource usage
   docker stats

   # Increase memory limits in docker-compose.yml
   ```

### Health Checks

```bash
# Check all services health
curl http://localhost/health
curl http://localhost/api/health/

# Check database connectivity
docker exec activitypass_db mysql -u activitypass -p activitypass -e "SELECT 1"
```

## Security Considerations

1. **Change default passwords** in `.env`
2. **Use strong DJANGO_SECRET_KEY**
3. **Enable HTTPS** with valid SSL certificate
4. **Configure firewall** to only allow necessary ports
5. **Regular updates** of Docker images
6. **Database backups** scheduled regularly
7. **Monitor logs** for security issues

## Performance Optimization

1. **Enable gzip compression** (already configured)
2. **Set up caching** headers for static files
3. **Use CDN** for static assets
4. **Configure database connection pooling**
5. **Set up Redis** for session caching (future enhancement)
6. **Monitor resource usage** and scale as needed

## Backup Strategy

1. **Database backups**:

   ```bash
   # Daily backup script
   0 2 * * * docker exec activitypass_db mysqldump -u root -p activitypass > /backup/daily_$(date +\%Y\%m\%d).sql
   ```

2. **File backups**:

   ```bash
   # Backup uploaded files and configurations
   tar -czf /backup/files_$(date +\%Y\%m\%d).tar.gz /path/to/uploads /path/to/configs
   ```

3. **Full container backups**:
   ```bash
   # Backup volumes
   docker run --rm -v activitypass_mysql_data:/data -v /backup:/backup alpine tar czf /backup/volumes_$(date +\%Y\%m\%d).tar.gz -C /data .
   ```

## Support

For issues or questions:

1. Check the [ActivityPass GitHub repository](https://github.com/Al-rimi/ActivityPass)
2. Review Docker and 1Panel documentation
3. Check service logs for error messages
4. Verify environment configuration

---

**Happy deploying! 🚀**
