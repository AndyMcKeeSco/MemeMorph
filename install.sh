#!/bin/bash

# MemeMorph Installation Script for Ubuntu
# This script installs all prerequisites and sets up the MemeMorph web application

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

# Display a nice header
echo -e "${GREEN}"
echo "================================================================="
echo "  __  __                      __  __                 _      "
echo " |  \/  | ___ _ __ ___   ___ |  \/  | ___  _ __ _ __| |__   "
echo " | |\/| |/ _ \ '_ \` _ \ / _ \| |\/| |/ _ \| '__| '__| '_ \  "
echo " | |  | |  __/ | | | | |  __/| |  | | (_) | |  | |  | | | | "
echo " |_|  |_|\___|_| |_| |_|\___||_|  |_|\___/|_|  |_|  |_| |_| "
echo "                                                             "
echo "================================================================="
echo -e "${NC}"
echo "This script will install all prerequisites for the MemeMorph project"
echo "and set up the web application on your Ubuntu system."
echo ""

# Check if running as root (we don't want to)
if [ "$(id -u)" -eq 0 ]; then
    error "This script should not be run as root or with sudo. It will ask for sudo permissions when needed."
    exit 1
fi

# Ask for confirmation
read -p "Do you want to proceed with the installation? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warning "Installation aborted by user."
    exit 1
fi

# Function to check if a command is available
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for base requirements
info "Checking base requirements..."
if ! command_exists curl || ! command_exists wget || ! command_exists git; then
    info "Installing basic requirements..."
    sudo apt-get update
    sudo apt-get install -y curl wget git
    success "Basic tools installed."
else
    success "Basic tools already installed."
fi

# Define the installation directory
INSTALL_DIR="$HOME/mememorph"
if [ -d "$INSTALL_DIR" ]; then
    warning "The directory $INSTALL_DIR already exists."
    read -p "Do you want to remove it and continue? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Removing existing installation directory..."
        rm -rf "$INSTALL_DIR"
    else
        error "Installation aborted. Please choose a different directory."
        exit 1
    fi
fi

# Create installation directory
info "Creating installation directory at $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
success "Installation directory created."

# Clone the repository
info "Cloning the MemeMorph repository..."
git clone https://github.com/AndyMcKeeSco/MemeMorph.git .
if [ $? -eq 0 ]; then
    success "Repository cloned successfully."
else
    error "Failed to clone the repository. Please check your internet connection and try again."
    exit 1
fi

# Install MongoDB
info "Installing MongoDB..."
if ! command_exists mongod; then
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
    success "MongoDB installed and started."
else
    success "MongoDB is already installed."
    # Make sure MongoDB is running
    if ! pgrep -x "mongod" > /dev/null; then
        info "Starting MongoDB..."
        sudo systemctl start mongod
        success "MongoDB started."
    else
        success "MongoDB is already running."
    fi
fi

# Install Node.js and npm
info "Installing Node.js and npm..."
if ! command_exists node || ! command_exists npm; then
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
    success "Node.js and npm installed."
else
    node_version=$(node -v)
    success "Node.js $node_version is already installed."
fi

# Install Python and pip
info "Installing Python and pip..."
if ! command_exists python3 || ! command_exists pip3; then
    sudo apt-get install -y python3 python3-pip python3-venv
    success "Python and pip installed."
else
    python_version=$(python3 --version)
    success "$python_version is already installed."
fi

# Install required system packages for Python libraries
info "Installing system dependencies for Python libraries..."
sudo apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-setuptools \
    python3-wheel \
    python3-pillow \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx
success "System dependencies installed."

# Set up Python virtual environment for backend
info "Setting up Python virtual environment for backend..."
cd "$INSTALL_DIR/MemeMorph/backend"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    success "Python dependencies installed."
else
    error "Failed to install Python dependencies."
    exit 1
fi

# Initialize MongoDB database
info "Initializing MongoDB database..."
python init_db.py
if [ $? -eq 0 ]; then
    success "MongoDB database initialized."
else
    error "Failed to initialize MongoDB database."
    exit 1
fi

# Download meme templates
info "Downloading meme templates..."
python download_templates.py
if [ $? -eq 0 ]; then
    success "Meme templates downloaded."
else
    warning "Failed to download meme templates. You may need to add them manually."
fi

# Create .env file for backend
info "Creating environment file for backend..."
cp .env.example .env
secret_key=$(openssl rand -hex 24)
sed -i "s/your-secret-key-here/$secret_key/g" .env
success "Backend environment file created."

# Deactivate virtual environment
deactivate

# Set up frontend
info "Setting up frontend..."
cd "$INSTALL_DIR/MemeMorph/frontend"
npm install
if [ $? -eq 0 ]; then
    success "Frontend dependencies installed."
else
    error "Failed to install frontend dependencies."
    exit 1
fi

# Create a .env file for frontend
info "Creating environment file for frontend..."
cat > .env << EOL
REACT_APP_API_URL=http://localhost:5000
REACT_APP_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
REACT_APP_NETWORK_ID=1337
EOL
success "Frontend environment file created."

# Create systemd service files for backend
info "Creating systemd service for backend..."
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
sudo systemctl daemon-reload
sudo systemctl enable mememorph-backend.service
sudo systemctl start mememorph-backend.service
success "Backend service created and started."

# Create systemd service for frontend
info "Creating systemd service for frontend..."
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
sudo systemctl daemon-reload
sudo systemctl enable mememorph-frontend.service
sudo systemctl start mememorph-frontend.service
success "Frontend service created and started."

# Final message
echo
echo -e "${GREEN}=================================================================${NC}"
echo -e "${GREEN}MemeMorph has been successfully installed!${NC}"
echo
echo "Your application is now running at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo
echo "To check the status of the services:"
echo "  sudo systemctl status mememorph-backend.service"
echo "  sudo systemctl status mememorph-frontend.service"
echo
echo "To view logs:"
echo "  sudo journalctl -u mememorph-backend.service -f"
echo "  sudo journalctl -u mememorph-frontend.service -f"
echo
echo "Installation directory: $INSTALL_DIR"
echo -e "${GREEN}=================================================================${NC}"
echo "Thank you for installing MemeMorph!"