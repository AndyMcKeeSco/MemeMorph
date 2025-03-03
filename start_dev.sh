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
