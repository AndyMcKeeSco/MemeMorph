#!/bin/bash

# MemeMorph Cleanup Script
# This script removes existing installations before setting up a clean development environment

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${RED}"
echo "====================================================="
echo "      MemeMorph Installation Cleanup                 "
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

echo -e "${YELLOW}WARNING: This script will remove virtual environments, node_modules, and other generated files.${NC}"
echo -e "${YELLOW}Do you want to continue? (y/n)${NC}"
read -r confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

# Cleanup backend
if [[ -d "${BACKEND_DIR}" ]]; then
    echo -e "${YELLOW}Cleaning up backend...${NC}"
    
    # Remove virtual environment
    if [[ -d "${BACKEND_DIR}/venv" ]]; then
        echo -e "${YELLOW}Removing virtual environment...${NC}"
        rm -rf "${BACKEND_DIR}/venv"
    fi
    
    # Remove generated directories
    echo -e "${YELLOW}Removing generated directories...${NC}"
    rm -rf "${BACKEND_DIR}/uploads" 2>/dev/null || true
    rm -rf "${BACKEND_DIR}/processed" 2>/dev/null || true
    rm -rf "${BACKEND_DIR}/__pycache__" 2>/dev/null || true
    
    # Remove environment files
    if [[ -f "${BACKEND_DIR}/.env" ]]; then
        echo -e "${YELLOW}Removing .env file...${NC}"
        rm "${BACKEND_DIR}/.env"
    fi
    
    echo -e "${GREEN}Backend cleanup complete.${NC}"
fi

# Cleanup frontend
if [[ -d "${FRONTEND_DIR}" ]]; then
    echo -e "${YELLOW}Cleaning up frontend...${NC}"
    
    # Remove node_modules
    if [[ -d "${FRONTEND_DIR}/node_modules" ]]; then
        echo -e "${YELLOW}Removing node_modules (this may take a moment)...${NC}"
        rm -rf "${FRONTEND_DIR}/node_modules"
    fi
    
    # Remove build directory
    if [[ -d "${FRONTEND_DIR}/build" ]]; then
        echo -e "${YELLOW}Removing build directory...${NC}"
        rm -rf "${FRONTEND_DIR}/build"
    fi
    
    # Remove environment files
    if [[ -f "${FRONTEND_DIR}/.env" ]]; then
        echo -e "${YELLOW}Removing .env file...${NC}"
        rm "${FRONTEND_DIR}/.env"
    fi
    
    echo -e "${GREEN}Frontend cleanup complete.${NC}"
fi

# Remove start_dev.sh if it exists
if [[ -f "${PROJECT_ROOT}/start_dev.sh" ]]; then
    echo -e "${YELLOW}Removing start_dev.sh...${NC}"
    rm "${PROJECT_ROOT}/start_dev.sh"
fi

echo -e "${GREEN}"
echo "====================================================="
echo "      MemeMorph Cleanup Complete!                    "
echo "====================================================="
echo "You can now run ./dev_setup.sh to set up a clean development environment."
echo -e "====================================================="
echo -e "${NC}"