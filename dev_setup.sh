#!/bin/bash

# MemeMorph Development Setup Script
# This script configures the project for local development by setting up
# symlinks that point to source directories, allowing developers to see changes
# without redeploying.

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${GREEN}"
echo "====================================================="
echo "      MemeMorph Development Environment Setup        "
echo "====================================================="
echo -e "${NC}"

# Detect project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"

# Check if running inside the project directory
if [[ ! -d "${PROJECT_ROOT}/MemeMorph" ]]; then
    echo -e "${RED}Error: Script must be run from the MemeMorph project root.${NC}"
    exit 1
fi

# Define paths
FRONTEND_DIR="${PROJECT_ROOT}/MemeMorph/frontend"
BACKEND_DIR="${PROJECT_ROOT}/MemeMorph/backend"
CONTRACTS_DIR="${PROJECT_ROOT}/MemeMorph/contracts"

# Check if directories exist
if [[ ! -d "$FRONTEND_DIR" || ! -d "$BACKEND_DIR" || ! -d "$CONTRACTS_DIR" ]]; then
    echo -e "${RED}Error: One or more required directories not found.${NC}"
    exit 1
fi

# Create a .env file for frontend if it doesn't exist
if [[ ! -f "${FRONTEND_DIR}/.env" ]]; then
    echo -e "${YELLOW}Creating frontend .env file...${NC}"
    cat > "${FRONTEND_DIR}/.env" << EOF
# Development environment configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_DEFAULT_NETWORK=local
REACT_APP_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
REACT_APP_TOKEN_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
EOF
    echo -e "${GREEN}Created frontend .env file.${NC}"
else
    echo -e "${YELLOW}Frontend .env file already exists.${NC}"
fi

# Create a .env file for backend if it doesn't exist
if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    cat > "${BACKEND_DIR}/.env" << EOF
# Development environment configuration
FLASK_APP=app.py
FLASK_ENV=development
WEB3_NETWORK=local
WEB3_PROVIDER_URI=http://localhost:8545
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
TOKEN_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
EOF
    echo -e "${GREEN}Created backend .env file.${NC}"
else
    echo -e "${YELLOW}Backend .env file already exists.${NC}"
fi

# Copy contract ABIs to frontend's public contracts directory
echo -e "${YELLOW}Copying contract ABIs to frontend...${NC}"
mkdir -p "${FRONTEND_DIR}/public/contracts"
cp "${BACKEND_DIR}/contracts/"*.json "${FRONTEND_DIR}/public/contracts/"
echo -e "${GREEN}Contract ABIs copied to frontend.${NC}"

# Setup local blockchain if requested
echo -e "${YELLOW}Would you like to setup a local blockchain for development? (y/n)${NC}"
read -r setup_blockchain
if [[ "$setup_blockchain" == "y" || "$setup_blockchain" == "Y" ]]; then
    echo -e "${YELLOW}Setting up local blockchain...${NC}"
    bash "${PROJECT_ROOT}/setup_local_blockchain.sh"
fi

# Create a development start script
echo -e "${YELLOW}Creating development startup script...${NC}"
cat > "${PROJECT_ROOT}/start_dev.sh" << 'EOF'
#!/bin/bash

# MemeMorph Development Startup Script
# This script starts both frontend and backend development servers

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define paths
FRONTEND_DIR="${PROJECT_ROOT}/MemeMorph/frontend"
BACKEND_DIR="${PROJECT_ROOT}/MemeMorph/backend"

# Check for Python venv and create if it doesn't exist
if [[ ! -f "${BACKEND_DIR}/venv/bin/activate" ]]; then
    echo -e "${YELLOW}Python virtual environment not found or incomplete. Creating it now...${NC}"
    cd "${BACKEND_DIR}"
    rm -rf venv
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo -e "${GREEN}Backend virtual environment created and dependencies installed.${NC}"
fi

# Check for node_modules
if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
    echo -e "${YELLOW}Node modules not found. Installing dependencies...${NC}"
    cd "${FRONTEND_DIR}"
    npm install
    echo -e "${GREEN}Dependencies installed.${NC}"
fi

# Function to stop all background processes when script exits
function cleanup {
    echo -e "${YELLOW}Stopping all processes...${NC}"
    kill $(jobs -p) 2>/dev/null || true
}

# Set up trap to call cleanup function when script exits
trap cleanup EXIT

# Start backend server
echo -e "${GREEN}Starting backend server...${NC}"
cd "${BACKEND_DIR}"
source venv/bin/activate
python app.py &
BACKEND_PID=$!
echo -e "${GREEN}Backend started with PID ${BACKEND_PID}${NC}"

# Wait a moment for backend to start
sleep 2

# Start frontend development server
echo -e "${GREEN}Starting frontend development server...${NC}"
cd "${FRONTEND_DIR}"
npm start &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started with PID ${FRONTEND_PID}${NC}"

echo -e "${GREEN}"
echo "====================================================="
echo "      MemeMorph Development Environment Active      "
echo "====================================================="
echo "Backend running at: http://localhost:5000"
echo "Frontend running at: http://localhost:3000"
echo "Press Ctrl+C to stop both servers"
echo -e "====================================================="
echo -e "${NC}"

# Wait for both processes
wait
EOF

chmod +x "${PROJECT_ROOT}/start_dev.sh"
echo -e "${GREEN}Created development startup script.${NC}"

# Install backend dependencies if venv doesn't exist
if [[ ! -d "${BACKEND_DIR}/venv" ]]; then
    echo -e "${YELLOW}Setting up backend virtual environment...${NC}"
    cd "${BACKEND_DIR}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo -e "${GREEN}Backend dependencies installed.${NC}"
else
    echo -e "${YELLOW}Backend virtual environment already exists.${NC}"
fi

# Always reinstall frontend dependencies to ensure correct paths
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "${FRONTEND_DIR}"
# Clean cache and node_modules to ensure fresh install with correct paths
if [[ -d "${FRONTEND_DIR}/node_modules" ]]; then
    echo -e "${YELLOW}Removing existing node_modules...${NC}"
    rm -rf "${FRONTEND_DIR}/node_modules"
fi
npm cache clean --force
npm install
echo -e "${GREEN}Frontend dependencies installed.${NC}"

echo -e "${GREEN}"
echo "====================================================="
echo "      MemeMorph Development Setup Complete!          "
echo "====================================================="
echo "To start the development environment:"
echo "  $ ./start_dev.sh"
echo ""
echo "Backend API: http://localhost:5000"
echo "Frontend UI: http://localhost:3000"
echo -e "====================================================="
echo -e "${NC}"