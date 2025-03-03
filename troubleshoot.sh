#!/bin/bash

# MemeMorph Troubleshooting Script
# This script checks the status of services and helps resolve common issues

set -e  # Exit immediately if a command exits with a non-zero status

# ANSI color codes for prettier output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Display header
echo -e "${GREEN}"
echo "================================================================="
echo "   __  __                     __  __                 _      "
echo "  |  \/  | ___ _ __ ___   ___|  \/  | ___  _ __ _ __| |__   "
echo "  | |\/| |/ _ \ '_ \` _ \ / _ \ |\/| |/ _ \| '__| '__| '_ \  "
echo "  | |  | |  __/ | | | | |  __/ |  | | (_) | |  | |  | | | | "
echo "  |_|  |_|\___|_| |_| |_|\___|_|  |_|\___/|_|  |_|  |_| |_| "
echo "                                                             "
echo "                Troubleshooting & Repair Tool                 "
echo "================================================================="
echo -e "${NC}"

# Get the installation directory
INSTALL_DIR="$HOME/mememorph"
if [ ! -d "$INSTALL_DIR" ]; then
    warning "The installation directory $INSTALL_DIR does not exist."
    read -p "Enter the path to your MemeMorph installation: " INSTALL_DIR
    
    if [ ! -d "$INSTALL_DIR" ]; then
        error "The specified directory does not exist. Exiting."
        exit 1
    fi
fi

# Check if we're running as root
if [ "$EUID" -eq 0 ]; then
    warning "This script is not intended to be run as root. Some operations may require sudo privileges."
fi

# Function to check systemd service
check_service() {
    local service_name="$1"
    info "Checking $service_name service status..."
    
    if systemctl is-active --quiet "$service_name"; then
        success "$service_name is running correctly."
        return 0
    else
        error "$service_name is not running."
        
        # Check if service exists
        if ! systemctl list-unit-files | grep -q "$service_name"; then
            warning "$service_name service does not exist."
            return 2
        fi
        
        # Check if service is enabled
        if ! systemctl is-enabled --quiet "$service_name"; then
            warning "$service_name is not enabled."
            return 3
        fi
        
        # Check service logs
        warning "Last 10 log entries for $service_name:"
        journalctl -u "$service_name" -n 10 --no-pager
        
        return 1
    fi
}

# Function to restart systemd service
restart_service() {
    local service_name="$1"
    info "Restarting $service_name service..."
    
    if sudo systemctl restart "$service_name"; then
        success "$service_name restarted successfully."
        return 0
    else
        error "Failed to restart $service_name."
        return 1
    fi
}

# Function to recreate systemd service
recreate_service() {
    local service_name="$1"
    local service_type="$2"  # 'backend' or 'frontend'
    
    info "Recreating $service_name service..."
    
    # Delete existing service
    if systemctl list-unit-files | grep -q "$service_name"; then
        info "Stopping and removing existing service..."
        sudo systemctl stop "$service_name" 2>/dev/null || true
        sudo systemctl disable "$service_name" 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/$service_name" 2>/dev/null || true
    fi
    
    # Create appropriate service file
    if [ "$service_type" = "backend" ]; then
        info "Creating backend service..."
        cat > /tmp/mememorph-backend.service << EOL
[Unit]
Description=MemeMorph Backend API
After=network.target mongod.service

[Service]
User=$(whoami)
WorkingDirectory=$INSTALL_DIR/MemeMorph/backend
ExecStart=$INSTALL_DIR/MemeMorph/backend/venv/bin/gunicorn --bind 0.0.0.0:5000 wsgi:app
Restart=always
RestartSec=5
Environment="PATH=$INSTALL_DIR/MemeMorph/backend/venv/bin"
EnvironmentFile=$INSTALL_DIR/MemeMorph/backend/.env

[Install]
WantedBy=multi-user.target
EOL
        sudo mv /tmp/mememorph-backend.service /etc/systemd/system/
    elif [ "$service_type" = "frontend" ]; then
        info "Creating frontend service..."
        cat > /tmp/mememorph-frontend.service << EOL
[Unit]
Description=MemeMorph Frontend
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=$INSTALL_DIR/MemeMorph/frontend
ExecStart=$(which npm) start
Restart=always
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOL
        sudo mv /tmp/mememorph-frontend.service /etc/systemd/system/
    else
        error "Unknown service type: $service_type"
        return 1
    fi
    
    # Reload systemd, enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable "$service_name"
    sudo systemctl start "$service_name"
    
    # Check if service started successfully
    if systemctl is-active --quiet "$service_name"; then
        success "Service $service_name created and started successfully."
        return 0
    else
        error "Service $service_name failed to start after recreation."
        journalctl -u "$service_name" -n 10 --no-pager
        return 1
    fi
}

# Function to check if a port is in use
check_port() {
    local port="$1"
    local process
    
    if command -v ss &> /dev/null; then
        process=$(ss -tuln | grep ":$port " | awk '{print $7}')
    else
        process=$(netstat -tuln | grep ":$port " | awk '{print $7}')
    fi
    
    if [ -n "$process" ]; then
        warning "Port $port is already in use by process $process"
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on a specific port
kill_port_process() {
    local port="$1"
    local pid
    
    if command -v lsof &> /dev/null; then
        pid=$(lsof -i:$port -t)
    else
        pid=$(fuser $port/tcp 2>/dev/null)
    fi
    
    if [ -n "$pid" ]; then
        info "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
        success "Process killed"
        return 0
    else
        warning "No process found on port $port"
        return 1
    fi
}

# Check MongoDB
info "Checking MongoDB status..."
if systemctl is-active --quiet mongod; then
    success "MongoDB is running."
else
    error "MongoDB is not running."
    warning "Attempting to start MongoDB..."
    
    if sudo systemctl start mongod; then
        success "MongoDB started successfully."
    else
        error "Failed to start MongoDB. Please check MongoDB installation."
        info "You can try reinstalling MongoDB with:"
        info "  sudo apt-get purge mongodb-org*"
        info "  sudo apt-get install -y mongodb-org"
        info "  sudo systemctl enable mongod"
        info "  sudo systemctl start mongod"
    fi
fi

# Check backend dependencies
info "Checking backend dependencies..."
if [ -d "$INSTALL_DIR/MemeMorph/backend/venv" ]; then
    success "Backend virtual environment exists."
else
    error "Backend virtual environment not found."
    warning "Creating virtual environment and installing dependencies..."
    
    cd "$INSTALL_DIR/MemeMorph/backend"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    
    success "Backend dependencies installed."
fi

# Check backend service
BACKEND_SERVICE="mememorph-backend.service"
if ! check_service "$BACKEND_SERVICE"; then
    warning "Attempting to restart the backend service..."
    
    if ! restart_service "$BACKEND_SERVICE"; then
        warning "Restart failed. Attempting to recreate the service..."
        
        # Check if port 5000 is in use
        if check_port 5000; then
            warning "Killing process on port 5000..."
            kill_port_process 5000
        fi
        
        recreate_service "$BACKEND_SERVICE" "backend"
    fi
fi

# Check frontend dependencies
info "Checking frontend dependencies..."
if [ -d "$INSTALL_DIR/MemeMorph/frontend/node_modules" ]; then
    success "Frontend dependencies exist."
else
    error "Frontend dependencies not found."
    warning "Installing frontend dependencies..."
    
    cd "$INSTALL_DIR/MemeMorph/frontend"
    npm install
    
    if [ $? -eq 0 ]; then
        success "Frontend dependencies installed."
    else
        error "Failed to install frontend dependencies."
    fi
fi

# Check frontend service
FRONTEND_SERVICE="mememorph-frontend.service"
if ! check_service "$FRONTEND_SERVICE"; then
    warning "Attempting to restart the frontend service..."
    
    if ! restart_service "$FRONTEND_SERVICE"; then
        warning "Restart failed. Attempting to recreate the service..."
        
        # Check if port 3000 is in use
        if check_port 3000; then
            warning "Killing process on port 3000..."
            kill_port_process 3000
        fi
        
        recreate_service "$FRONTEND_SERVICE" "frontend"
    fi
fi

# Check frontend environment
info "Checking frontend environment configuration..."
if [ -f "$INSTALL_DIR/MemeMorph/frontend/.env" ]; then
    success "Frontend environment file exists."
else
    error "Frontend environment file not found."
    warning "Creating frontend environment file..."
    
    cp "$INSTALL_DIR/MemeMorph/frontend/.env.example" "$INSTALL_DIR/MemeMorph/frontend/.env"
    
    success "Frontend environment file created."
fi

# Check backend environment
info "Checking backend environment configuration..."
if [ -f "$INSTALL_DIR/MemeMorph/backend/.env" ]; then
    success "Backend environment file exists."
else
    error "Backend environment file not found."
    warning "Creating backend environment file..."
    
    cp "$INSTALL_DIR/MemeMorph/backend/.env.example" "$INSTALL_DIR/MemeMorph/backend/.env"
    secret_key=$(openssl rand -hex 24)
    sed -i "s/your-secret-key-here/$secret_key/g" "$INSTALL_DIR/MemeMorph/backend/.env"
    
    success "Backend environment file created."
fi

# Verify port access
info "Verifying port access..."

# Try frontend connection
info "Testing frontend connection (http://localhost:3000)..."
if curl -s http://localhost:3000 > /dev/null; then
    success "Frontend is accessible at http://localhost:3000"
else
    error "Cannot access frontend at http://localhost:3000"
fi

# Try backend connection
info "Testing backend connection (http://localhost:5000)..."
if curl -s http://localhost:5000 > /dev/null; then
    success "Backend is accessible at http://localhost:5000"
else
    error "Cannot access backend at http://localhost:5000"
fi

# Check for frontend browser cache issues
info "If the frontend is having issues, you might want to clear your browser cache"
info "or try accessing the site in an incognito/private browsing window."

# Manual startup option
echo
echo -e "${YELLOW}Would you like to manually start the services for debugging?${NC}"
read -p "Enter 'y' for yes, any other key to skip: " manual_choice

if [[ "$manual_choice" == "y" || "$manual_choice" == "Y" ]]; then
    # Stop services first
    sudo systemctl stop mememorph-frontend.service mememorph-backend.service
    
    # Start backend manually
    echo
    info "Starting backend manually for debugging..."
    echo "cd $INSTALL_DIR/MemeMorph/backend && source venv/bin/activate && python app.py"
    echo -e "${YELLOW}Press Ctrl+C to stop the backend when finished debugging${NC}"
    echo
    
    cd "$INSTALL_DIR/MemeMorph/backend"
    source venv/bin/activate
    python app.py
    
    # Start frontend manually
    echo
    info "Starting frontend manually for debugging..."
    echo "cd $INSTALL_DIR/MemeMorph/frontend && npm start"
    echo -e "${YELLOW}Press Ctrl+C to stop the frontend when finished debugging${NC}"
    echo
    
    cd "$INSTALL_DIR/MemeMorph/frontend"
    npm start
    
    # Restart services
    info "Restarting services..."
    sudo systemctl start mememorph-backend.service mememorph-frontend.service
fi

echo
echo -e "${GREEN}Troubleshooting complete!${NC}"
echo "If problems persist, please check the following:"
echo "1. MongoDB is running and accessible"
echo "2. Required ports (3000, 5000) are not blocked or in use by other applications"
echo "3. All dependencies are correctly installed"
echo
echo "You can view detailed logs with:"
echo "  sudo journalctl -u mememorph-backend.service -f"
echo "  sudo journalctl -u mememorph-frontend.service -f"
echo
echo -e "${GREEN}=================================================================${NC}"