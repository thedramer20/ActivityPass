#!/bin/bash

# ActivityPass Deployment Script for 1Panel
# This script helps deploy the ActivityPass application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are available
check_dependencies() {
    print_info "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Dependencies check passed"
}

# Setup environment file
setup_environment() {
    print_info "Setting up environment configuration..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.docker" ]; then
            cp .env.docker .env
            print_warning "Copied .env.docker to .env. Please edit .env with your actual configuration before deploying."
            print_warning "Especially change the DJANGO_SECRET_KEY and database passwords!"
        else
            print_error ".env.docker template not found. Please create your .env file manually."
            exit 1
        fi
    else
        print_info ".env file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."

    mkdir -p nginx/ssl
    mkdir -p scripts

    # Create init.sql for database initialization
    if [ ! -f "scripts/init.sql" ]; then
        cat > scripts/init.sql << 'EOF'
-- Database initialization script for ActivityPass
-- This will be run when the MySQL container starts for the first time

-- Set character set and collation
ALTER DATABASE activitypass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create database user if it doesn't exist
CREATE USER IF NOT EXISTS 'activitypass'@'%' IDENTIFIED BY 'activitypass123';
GRANT ALL PRIVILEGES ON activitypass.* TO 'activitypass'@'%';
FLUSH PRIVILEGES;
EOF
        print_info "Created database initialization script"
    fi
}

# Build and start services
deploy_services() {
    print_info "Building and starting services..."

    # Use docker compose (newer syntax) if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    # Build images
    print_info "Building Docker images..."
    $COMPOSE_CMD build

    # Start services
    print_info "Starting services..."
    $COMPOSE_CMD up -d

    print_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_info "Waiting for services to be ready..."

    # Wait for database
    print_info "Waiting for database..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker exec activitypass_db mysqladmin ping -h localhost --silent; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        print_error "Database failed to start"
        exit 1
    fi

    # Wait for backend
    print_info "Waiting for backend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:8000/api/health/ &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        print_warning "Backend health check failed, but continuing..."
    fi

    # Wait for frontend
    print_info "Waiting for frontend..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost/health &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        print_warning "Frontend health check failed, but continuing..."
    fi

    print_success "Services are ready"
}

# Show status and access information
show_status() {
    print_success "Deployment completed!"
    echo
    print_info "Service Status:"
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi

    echo
    print_info "Access URLs:"
    echo "  Frontend: http://your-server-ip"
    echo "  Backend API: http://your-server-ip/api"
    echo "  Database: localhost:3306 (from host)"

    echo
    print_info "Useful commands:"
    echo "  View logs: docker compose logs -f [service-name]"
    echo "  Stop services: docker compose down"
    echo "  Restart service: docker compose restart [service-name]"
    echo "  Update and redeploy: docker compose up -d --build"
}

# Main deployment function
main() {
    echo "=========================================="
    echo "  ActivityPass Deployment for 1Panel"
    echo "=========================================="
    echo

    check_dependencies
    setup_environment
    create_directories
    deploy_services
    wait_for_services
    show_status

    echo
    print_success "ActivityPass has been successfully deployed!"
    print_info "Don't forget to:"
    print_info "  1. Update your .env file with production settings"
    print_info "  2. Set up SSL certificates for HTTPS"
    print_info "  3. Configure your domain name"
    print_info "  4. Set up backups for the database"
}

# Handle command line arguments
case "${1:-}" in
    "stop")
        print_info "Stopping services..."
        if docker compose version &> /dev/null; then
            docker compose down
        else
            docker-compose down
        fi
        print_success "Services stopped"
        ;;
    "restart")
        print_info "Restarting services..."
        if docker compose version &> /dev/null; then
            docker compose restart
        else
            docker-compose restart
        fi
        print_success "Services restarted"
        ;;
    "logs")
        if docker compose version &> /dev/null; then
            docker compose logs -f "${2:-}"
        else
            docker-compose logs -f "${2:-}"
        fi
        ;;
    "update")
        print_info "Updating and rebuilding services..."
        if docker compose version &> /dev/null; then
            docker compose down
            docker compose build --no-cache
            docker compose up -d
        else
            docker-compose down
            docker-compose build --no-cache
            docker-compose up -d
        fi
        wait_for_services
        show_status
        ;;
    *)
        main
        ;;
esac