#!/bin/bash

# Error handling
set -e

# Set colors
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${YELLOW}Deploying MemeMorph contracts to Sepolia...${NC}"

# Navigate to the sepolia directory
cd "$(dirname "$0")/sepolia"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "Please create an .env file with your deployment configuration."
    echo -e "You can copy .env.example and fill in your private key and API keys."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Run the deployment script
echo -e "${YELLOW}Starting deployment...${NC}"
node deploy.js

# Check the exit status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}Deployment summary can be found in the project root directory.${NC}"