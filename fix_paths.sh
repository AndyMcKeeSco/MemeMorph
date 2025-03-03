#!/bin/bash

# MemeMorph Path Fix Script
# This script fixes path issues that might occur between different environments

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${GREEN}"
echo "====================================================="
echo "      MemeMorph Path Fix Tool                        "
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

echo -e "${YELLOW}Starting path fix operations...${NC}"

# Fix frontend paths
if [[ -d "${FRONTEND_DIR}" ]]; then
    echo -e "${YELLOW}Fixing frontend paths...${NC}"
    
    # Check for node_modules and reinstall if necessary
    if [[ -d "${FRONTEND_DIR}/node_modules" ]]; then
        echo -e "${YELLOW}Removing existing node_modules (this may take a moment)...${NC}"
        rm -rf "${FRONTEND_DIR}/node_modules"
    fi
    
    echo -e "${YELLOW}Reinstalling npm dependencies to fix paths...${NC}"
    cd "${FRONTEND_DIR}"
    npm cache clean --force
    npm install
    
    echo -e "${GREEN}Frontend path fix complete.${NC}"
fi

# Fix backend paths if needed
if [[ -d "${BACKEND_DIR}" ]]; then
    echo -e "${YELLOW}Checking backend paths...${NC}"
    
    # If virtual environment exists but is referencing the wrong path
    if [[ -d "${BACKEND_DIR}/venv" ]]; then
        echo -e "${YELLOW}Recreating virtual environment to fix paths...${NC}"
        rm -rf "${BACKEND_DIR}/venv"
        cd "${BACKEND_DIR}"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        deactivate
        echo -e "${GREEN}Backend virtual environment recreated.${NC}"
    fi
fi

echo -e "${GREEN}"
echo "====================================================="
echo "      MemeMorph Path Fix Complete!                   "
echo "====================================================="
echo "You can now run ./start_dev.sh to start development servers."
echo -e "====================================================="
echo -e "${NC}"