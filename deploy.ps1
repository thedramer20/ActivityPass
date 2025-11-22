# ActivityPass Deployment Script for 1Panel (Windows)
# This script helps deploy the ActivityPass application using Docker Compose

param(
    [string]$Action = "deploy",
    [string]$Service = ""
)

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"

function Write-Info {
    param([string]$Message)
    Write-Host "[$BLUE[INFO]$NC] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$GREEN[SUCCESS]$NC] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[$YELLOW[WARNING]$NC] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[$RED[ERROR]$NC] $Message" -ForegroundColor Red
}

# Check if Docker and Docker Compose are available
function Test-Dependencies {
    Write-Info "Checking dependencies..."

    try {
        $null = docker --version
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }

    try {
        if (docker compose version 2>$null) {
            $script:DOCKER_COMPOSE_CMD = "docker compose"
        }
        elseif (docker-compose --version 2>$null) {
            $script:DOCKER_COMPOSE_CMD = "docker-compose"
        }
        else {
            throw "Docker Compose not found"
        }
    }
    catch {
        Write-Error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }

    Write-Success "Dependencies check passed"
}

# Setup environment file
function Initialize-Environment {
    Write-Info "Setting up environment configuration..."

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.docker") {
            Copy-Item ".env.docker" ".env"
            Write-Warning "Copied .env.docker to .env. Please edit .env with your actual configuration before deploying."
            Write-Warning "Especially change the DJANGO_SECRET_KEY and database passwords!"
        }
        else {
            Write-Error ".env.docker template not found. Please create your .env file manually."
            exit 1
        }
    }
    else {
        Write-Info ".env file already exists"
    }
}

# Create necessary directories
function New-Directories {
    Write-Info "Creating necessary directories..."

    $dirs = @("nginx/ssl", "scripts")
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    # Create init.sql for database initialization
    $initSqlPath = "scripts/init.sql"
    if (-not (Test-Path $initSqlPath)) {
        $initSql = @"
-- Database initialization script for ActivityPass
-- This will be run when the MySQL container starts for the first time

-- Set character set and collation
ALTER DATABASE activitypass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create database user if it doesn't exist
CREATE USER IF NOT EXISTS 'activitypass'@'%' IDENTIFIED BY 'activitypass123';
GRANT ALL PRIVILEGES ON activitypass.* TO 'activitypass'@'%';
FLUSH PRIVILEGES;
"@
        $initSql | Out-File -FilePath $initSqlPath -Encoding UTF8
        Write-Info "Created database initialization script"
    }
}

# Build and start services
function Start-Services {
    Write-Info "Building and starting services..."

    # Build images
    Write-Info "Building Docker images..."
    & $DOCKER_COMPOSE_CMD build

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build Docker images"
        exit 1
    }

    # Start services
    Write-Info "Starting services..."
    & $DOCKER_COMPOSE_CMD up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start services"
        exit 1
    }

    Write-Success "Services started successfully"
}

# Wait for services to be healthy
function Wait-Services {
    Write-Info "Waiting for services to be ready..."

    # Wait for database
    Write-Info "Waiting for database..."
    $timeout = 60
    while ($timeout -gt 0) {
        try {
            docker exec activitypass_db mysqladmin ping -h localhost --silent
            if ($LASTEXITCODE -eq 0) {
                break
            }
        }
        catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $timeout -= 2
    }

    if ($timeout -le 0) {
        Write-Error "Database failed to start"
        exit 1
    }

    # Wait for backend
    Write-Info "Waiting for backend..."
    $timeout = 60
    while ($timeout -gt 0) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health/" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                break
            }
        }
        catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $timeout -= 2
    }

    if ($timeout -le 0) {
        Write-Warning "Backend health check failed, but continuing..."
    }

    # Wait for frontend
    Write-Info "Waiting for frontend..."
    $timeout = 30
    while ($timeout -gt 0) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                break
            }
        }
        catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $timeout -= 2
    }

    if ($timeout -le 0) {
        Write-Warning "Frontend health check failed, but continuing..."
    }

    Write-Success "Services are ready"
}

# Show status and access information
function Show-Status {
    Write-Success "Deployment completed!"
    Write-Host ""

    Write-Info "Service Status:"
    & $DOCKER_COMPOSE_CMD ps

    Write-Host ""
    Write-Info "Access URLs:"
    Write-Host "  Frontend: http://your-server-ip"
    Write-Host "  Backend API: http://your-server-ip/api"
    Write-Host "  Database: localhost:3306 (from host)"

    Write-Host ""
    Write-Info "Useful commands:"
    Write-Host "  View logs: docker compose logs -f [service-name]"
    Write-Host "  Stop services: docker compose down"
    Write-Host "  Restart service: docker compose restart [service-name]"
    Write-Host "  Update and redeploy: docker compose up -d --build"
}

# Main deployment function
function Start-Deployment {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  ActivityPass Deployment for 1Panel" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""

    Test-Dependencies
    Initialize-Environment
    New-Directories
    Start-Services
    Wait-Services
    Show-Status

    Write-Host ""
    Write-Success "ActivityPass has been successfully deployed!"
    Write-Info "Don't forget to:"
    Write-Info "  1. Update your .env file with production settings"
    Write-Info "  2. Set up SSL certificates for HTTPS"
    Write-Info "  3. Configure your domain name"
    Write-Info "  4. Set up backups for the database"
}

# Main script logic
switch ($Action) {
    "stop" {
        Write-Info "Stopping services..."
        & $DOCKER_COMPOSE_CMD down
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Services stopped"
        }
        else {
            Write-Error "Failed to stop services"
        }
    }
    "restart" {
        Write-Info "Restarting services..."
        & $DOCKER_COMPOSE_CMD restart
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Services restarted"
        }
        else {
            Write-Error "Failed to restart services"
        }
    }
    "logs" {
        if ($Service) {
            & $DOCKER_COMPOSE_CMD logs -f $Service
        }
        else {
            & $DOCKER_COMPOSE_CMD logs -f
        }
    }
    "update" {
        Write-Info "Updating and rebuilding services..."
        & $DOCKER_COMPOSE_CMD down
        & $DOCKER_COMPOSE_CMD build --no-cache
        & $DOCKER_COMPOSE_CMD up -d
        Wait-Services
        Show-Status
    }
    default {
        Start-Deployment
    }
}