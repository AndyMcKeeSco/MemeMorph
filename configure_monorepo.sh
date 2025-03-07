#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Configuring MemeMorph monorepo structure...${NC}"

# Create the directories
mkdir -p contracts truffle/migrations sepolia/migrations

# Check if the contracts directory has the required contracts
if [ ! -f "contracts/MemeMorphCoin.sol" ] || [ ! -f "contracts/MemeMorphNFT.sol" ]; then
    echo -e "${RED}Contracts not found in the /contracts directory.${NC}"
    exit 1
fi

# Update the truffle-config.js files
echo "Updating Truffle configuration files..."

# Truffle directory config
cat > truffle/truffle-config.js << 'EOL'
module.exports = {
  // Define contracts_directory to use the shared contracts
  contracts_directory: "../contracts",
  
  networks: {
    // Development network (default)
    development: {
      host: "127.0.0.1",      // Localhost
      port: 8545,             // Standard Ethereum port
      network_id: "*",        // Match any network id
      gas: 6000000,           // Gas limit
      gasPrice: 20000000000,  // 20 gwei
    },
    
    // Ganache GUI network
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },
    
    // For Ganache CLI
    ganacheCLI: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.21",      // Match your contract version
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  
  // Plugin for contract verification on Etherscan
  plugins: [
    'truffle-plugin-verify'
  ],
  
  // API keys for contract verification
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY || ''  // Add your Etherscan API key here for verification on testnets
  }
};
EOL

# Copy migration files
cp sepolia/migrations/*.js truffle/migrations/

# Create a README for the contracts directory
cat > contracts/README.md << 'EOL'
# MemeMorph Smart Contracts

This directory contains the smart contracts for the MemeMorph platform, using a monorepo structure.

## Contract Overview

- **MemeMorphCoin.sol**: ERC20 token implementation for the platform's economy
- **MemeMorphNFT.sol**: ERC721 NFT implementation with minting and claiming functionality
- **Migrations.sol**: Standard Truffle migrations contract

## Monorepo Structure

These contracts are the source of truth for both:

1. Local development environment (in `../truffle/`)
2. Sepolia testnet deployment (in `../sepolia/`)

Both environments reference these same contract files through the `contracts_directory` setting in their respective `truffle-config.js` files.

## Development Process

When making changes to contracts:

1. Edit the contracts in this directory
2. Test using the local development environment: `cd ../truffle && truffle test`
3. Deploy to testnets with: `../deploy_to_sepolia.sh` 

## Dependencies

These contracts use OpenZeppelin libraries. Current versions:
- OpenZeppelin Contracts v5.0.0+

## Security

- Never store private keys or sensitive information in these contract files
- Always audit code before deployment
- Consider using formal verification tools for critical contracts
EOL

echo -e "${GREEN}Monorepo configuration complete!${NC}"
echo ""
echo "The project now has the following structure:"
echo "- /contracts/ - Shared contract files (single source of truth)"
echo "- /truffle/ - Local development environment"
echo "- /sepolia/ - Sepolia testnet deployment"
echo ""
echo "Both environments now reference the same contracts."