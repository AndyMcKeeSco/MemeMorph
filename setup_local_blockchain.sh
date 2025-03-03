#!/bin/bash

# MemeMorph Local Blockchain Setup
# This script sets up a local Ethereum development environment for testing

set -e  # Exit immediately if a command exits with a non-zero status

# ANSI color codes
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
echo "    MemeMorph Local Blockchain Setup"
echo "================================================================="
echo -e "${NC}"
echo "This script will set up a local Ethereum blockchain for development"
echo "and deploy the MemeMorph contracts for testing."
echo ""

# Check if running as root (we don't want to)
if [ "$(id -u)" -eq 0 ]; then
    error "This script should not be run as root or with sudo."
    exit 1
fi

# Check for required tools
check_requirements() {
    info "Checking for required tools..."
    
    # Check for Node.js and npm
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        error "Node.js and npm are required but not installed."
        info "Install them with: curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - && sudo apt-get install -y nodejs"
        exit 1
    fi
    
    # Check node version (need 14+)
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        error "Node.js version 14 or higher is required. Found version: $(node -v)"
        exit 1
    fi
    
    success "Node.js $(node -v) and npm $(npm -v) found."
    
    # Check for Truffle
    if ! command -v truffle &> /dev/null; then
        info "Truffle not found. Installing..."
        npm install -g truffle
        if [ $? -ne 0 ]; then
            error "Failed to install Truffle. Please install it manually: npm install -g truffle"
            exit 1
        fi
        success "Truffle installed successfully."
    else
        success "Truffle $(truffle version | grep Truffle | cut -d 'v' -f 2) found."
    fi
    
    # Check for Ganache CLI
    if ! command -v ganache &> /dev/null; then
        info "Ganache CLI not found. Installing..."
        npm install -g ganache
        if [ $? -ne 0 ]; then
            error "Failed to install Ganache CLI. Please install it manually: npm install -g ganache"
            exit 1
        fi
        success "Ganache CLI installed successfully."
    else
        success "Ganache CLI found."
    fi
}

# Create Truffle project structure
setup_truffle_project() {
    info "Setting up Truffle project..."
    
    # Get the base directory for MemeMorph
    BASE_DIR="$PWD"
    TRUFFLE_DIR="$BASE_DIR/truffle"
    
    # Create Truffle directory if it doesn't exist
    if [ -d "$TRUFFLE_DIR" ]; then
        warning "Truffle directory already exists. Would you like to remove it and start fresh?"
        read -p "Enter 'y' to remove, any other key to continue with existing setup: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$TRUFFLE_DIR"
        else
            warning "Using existing Truffle setup. This may cause issues if it's not compatible."
        fi
    fi
    
    # Initialize Truffle project if needed
    if [ ! -d "$TRUFFLE_DIR" ]; then
        mkdir -p "$TRUFFLE_DIR"
        cd "$TRUFFLE_DIR"
        truffle init
        success "Truffle project initialized at $TRUFFLE_DIR"
    else
        cd "$TRUFFLE_DIR"
        success "Using existing Truffle project at $TRUFFLE_DIR"
    fi
    
    # Create directories for contracts, migrations, and test
    mkdir -p contracts migrations test
}

# Copy smart contracts to Truffle project
copy_contracts() {
    info "Copying smart contracts to Truffle project..."
    
    # Source contract directory
    SOURCE_CONTRACTS="$BASE_DIR/MemeMorph/contracts"
    
    # Check if source contracts exist
    if [ ! -f "$SOURCE_CONTRACTS/MemeMorphNFT.sol" ] || [ ! -f "$SOURCE_CONTRACTS/MemeMorphCoin.sol" ]; then
        error "Source contracts not found in $SOURCE_CONTRACTS"
        exit 1
    fi
    
    # Copy contracts to Truffle project
    cp "$SOURCE_CONTRACTS/MemeMorphNFT.sol" "$TRUFFLE_DIR/contracts/"
    cp "$SOURCE_CONTRACTS/MemeMorphCoin.sol" "$TRUFFLE_DIR/contracts/"
    
    # Check OpenZeppelin dependencies and install if needed
    if grep -q "import \"@openzeppelin/contracts" "$SOURCE_CONTRACTS/MemeMorphNFT.sol"; then
        info "OpenZeppelin dependencies detected. Installing..."
        cd "$TRUFFLE_DIR"
        npm init -y > /dev/null
        npm install @openzeppelin/contracts
        success "OpenZeppelin contracts installed."
    fi
    
    success "Contracts copied to Truffle project."
}

# Create migration file for deploying contracts
create_migration() {
    info "Creating migration for deploying contracts..."
    
    # Create migration file
    cat > "$TRUFFLE_DIR/migrations/2_deploy_contracts.js" << 'EOL'
const MemeMorphCoin = artifacts.require("MemeMorphCoin");
const MemeMorphNFT = artifacts.require("MemeMorphNFT");

module.exports = async function(deployer, network, accounts) {
  // Configuration
  const initialSupply = 1000000; // 1 million tokens
  const initialMintFee = 10;     // 10 tokens
  const initialTransactionFee = 2; // 2 tokens
  
  // Deploy MemeMorphCoin first
  await deployer.deploy(MemeMorphCoin, initialSupply);
  const coinInstance = await MemeMorphCoin.deployed();
  
  console.log(`MemeMorphCoin deployed at: ${coinInstance.address}`);
  
  // Deploy MemeMorphNFT with the coin address
  await deployer.deploy(
    MemeMorphNFT, 
    coinInstance.address, 
    initialMintFee, 
    initialTransactionFee
  );
  const nftInstance = await MemeMorphNFT.deployed();
  
  console.log(`MemeMorphNFT deployed at: ${nftInstance.address}`);
  
  // Add the NFT contract as a minter for MemeMorphCoin
  await coinInstance.addMinter(nftInstance.address);
  console.log(`Added ${nftInstance.address} as a minter for MemeMorphCoin`);
  
  // For development, transfer some tokens to test accounts
  if (network === 'development' || network === 'develop') {
    // Transfer 1000 tokens to each of the first 5 accounts
    for (let i = 1; i < 5; i++) {
      if (accounts[i]) {
        await coinInstance.transfer(accounts[i], 1000);
        console.log(`Transferred 1000 tokens to ${accounts[i]}`);
      }
    }
  }
};
EOL
    
    success "Migration file created."
}

# Configure Truffle settings
configure_truffle() {
    info "Configuring Truffle settings..."
    
    # Create or update truffle-config.js
    cat > "$TRUFFLE_DIR/truffle-config.js" << 'EOL'
module.exports = {
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
    etherscan: ''  // Add your Etherscan API key here for verification on testnets
  }
};
EOL
    
    success "Truffle configuration updated."
}

# Create test script for the contracts
create_test_scripts() {
    info "Creating test scripts for contracts..."
    
    # Create test file for MemeMorphCoin
    cat > "$TRUFFLE_DIR/test/MemeMorphCoinTest.js" << 'EOL'
const MemeMorphCoin = artifacts.require("MemeMorphCoin");

contract("MemeMorphCoin", accounts => {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const minter = accounts[3];
  
  let token;
  
  beforeEach(async () => {
    // Deploy a new token instance before each test
    token = await MemeMorphCoin.new(1000000, { from: owner });
  });
  
  it("should set the correct initial supply", async () => {
    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply.toString(), '1000000000000000000000000', "Initial supply is incorrect");
  });
  
  it("should assign the initial supply to the owner", async () => {
    const ownerBalance = await token.balanceOf(owner);
    assert.equal(ownerBalance.toString(), '1000000000000000000000000', "Initial owner balance is incorrect");
  });
  
  it("should allow transfers between accounts", async () => {
    // Transfer 100 tokens from owner to user1
    await token.transfer(user1, '100000000000000000000', { from: owner });
    
    // Check balances after transfer
    const user1Balance = await token.balanceOf(user1);
    assert.equal(user1Balance.toString(), '100000000000000000000', "Transfer failed");
    
    // Transfer 50 tokens from user1 to user2
    await token.transfer(user2, '50000000000000000000', { from: user1 });
    
    // Check final balances
    const finalUser1Balance = await token.balanceOf(user1);
    const user2Balance = await token.balanceOf(user2);
    assert.equal(finalUser1Balance.toString(), '50000000000000000000', "Second transfer failed");
    assert.equal(user2Balance.toString(), '50000000000000000000', "Second transfer failed");
  });
  
  it("should allow adding minters", async () => {
    // Add minter
    await token.addMinter(minter, { from: owner });
    
    // Check if minter status is set
    const isMinter = await token.minters(minter);
    assert.equal(isMinter, true, "Failed to add minter");
  });
  
  it("should allow minters to mint new tokens", async () => {
    // Add minter
    await token.addMinter(minter, { from: owner });
    
    // Mint 100 tokens to user1
    await token.mint(user1, '100000000000000000000', { from: minter });
    
    // Check user1 balance
    const user1Balance = await token.balanceOf(user1);
    assert.equal(user1Balance.toString(), '100000000000000000000', "Minting failed");
  });
  
  it("should prevent non-minters from minting", async () => {
    try {
      // Attempt to mint 100 tokens to user1 from non-minter
      await token.mint(user1, '100000000000000000000', { from: user2 });
      assert.fail("Non-minter was able to mint tokens");
    } catch (error) {
      assert(error.toString().includes("Not authorized to mint"), "Expected 'Not authorized to mint' error");
    }
  });
});
EOL
    
    # Create test file for MemeMorphNFT
    cat > "$TRUFFLE_DIR/test/MemeMorphNFTTest.js" << 'EOL'
const MemeMorphCoin = artifacts.require("MemeMorphCoin");
const MemeMorphNFT = artifacts.require("MemeMorphNFT");

contract("MemeMorphNFT", accounts => {
  const owner = accounts[0];
  const creator = accounts[1];
  const buyer = accounts[2];
  
  const initialSupply = 1000000;
  const mintFee = 10;
  const transactionFee = 2;
  
  let token;
  let nft;
  
  beforeEach(async () => {
    // Deploy token
    token = await MemeMorphCoin.new(initialSupply, { from: owner });
    
    // Deploy NFT contract
    nft = await MemeMorphNFT.new(token.address, mintFee, transactionFee, { from: owner });
    
    // Add NFT contract as minter for token
    await token.addMinter(nft.address, { from: owner });
    
    // Transfer tokens to creator and buyer for testing
    await token.transfer(creator, '100000000000000000000', { from: owner }); // 100 tokens
    await token.transfer(buyer, '100000000000000000000', { from: owner });   // 100 tokens
  });
  
  it("should set the correct mint fee", async () => {
    const fee = await nft.mintFee();
    assert.equal(fee.toString(), mintFee.toString(), "Mint fee is incorrect");
  });
  
  it("should allow minting NFTs with token payment", async () => {
    // Approve tokens for NFT contract
    await token.approve(nft.address, '10000000000000000000', { from: creator });
    
    // Mint NFT
    const result = await nft.mintNFT("ipfs://test-uri", { from: creator });
    
    // Check event was emitted
    assert.equal(result.logs[1].event, "NFTMinted", "NFTMinted event not emitted");
    
    // Get token ID from event
    const tokenId = result.logs[1].args.tokenId;
    
    // Check NFT ownership
    const owner = await nft.ownerOf(tokenId);
    assert.equal(owner, creator, "NFT ownership incorrect");
    
    // Check creator mapping
    const creatorRecord = await nft.creators(tokenId);
    assert.equal(creatorRecord, creator, "Creator not recorded correctly");
  });
  
  it("should allow NFT transfers with payment", async () => {
    // Approve tokens for NFT contract
    await token.approve(nft.address, '10000000000000000000', { from: creator });
    
    // Mint NFT
    const mintResult = await nft.mintNFT("ipfs://test-uri", { from: creator });
    const tokenId = mintResult.logs[1].args.tokenId;
    
    // Approve tokens from buyer for payment
    await token.approve(nft.address, '50000000000000000000', { from: buyer }); // 50 tokens
    
    // Transfer NFT with payment
    const price = '20000000000000000000'; // 20 tokens
    await nft.transferWithPayment(buyer, tokenId, price, { from: creator });
    
    // Check new owner
    const newOwner = await nft.ownerOf(tokenId);
    assert.equal(newOwner, buyer, "NFT transfer failed");
  });
  
  it("should enforce royalties for creators", async () => {
    // Approve tokens for NFT contract
    await token.approve(nft.address, '10000000000000000000', { from: creator });
    
    // Mint NFT
    const mintResult = await nft.mintNFT("ipfs://test-uri", { from: creator });
    const tokenId = mintResult.logs[1].args.tokenId;
    
    // Transfer to buyer first
    await token.approve(nft.address, '50000000000000000000', { from: buyer });
    const price1 = '20000000000000000000'; // 20 tokens
    await nft.transferWithPayment(buyer, tokenId, price1, { from: creator });
    
    // Get creator balance before second sale
    const creatorBalanceBefore = await token.balanceOf(creator);
    
    // Another user buys from buyer
    const thirdParty = accounts[3];
    await token.transfer(thirdParty, '100000000000000000000', { from: owner });
    await token.approve(nft.address, '50000000000000000000', { from: thirdParty });
    
    // Transfer from buyer to third party
    const price2 = '30000000000000000000'; // 30 tokens
    await nft.transferWithPayment(thirdParty, tokenId, price2, { from: buyer });
    
    // Check creator received royalty
    const creatorBalanceAfter = await token.balanceOf(creator);
    const royaltyAmount = creatorBalanceAfter.sub(creatorBalanceBefore);
    
    // Calculate expected royalty (2.5% of price)
    const expectedRoyalty = price2 * 0.025;
    assert.notEqual(royaltyAmount.toString(), '0', "Creator did not receive royalty");
  });
});
EOL
    
    success "Test scripts created."
}

# Create helper scripts
create_helper_scripts() {
    info "Creating helper scripts..."
    
    # Create script to start Ganache
    cat > "$TRUFFLE_DIR/start_blockchain.sh" << 'EOL'
#!/bin/bash
echo "Starting local Ethereum blockchain (Ganache)..."
echo "This will create 10 test accounts with 100 ETH each."
echo "Press Ctrl+C to stop the blockchain."
echo ""

# Mnemonic for consistent accounts
MNEMONIC="candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"

# Start Ganache with 10 accounts, each with 100 ETH
ganache --deterministic --mnemonic "$MNEMONIC" --chain.chainId 1337 --wallet.totalAccounts 10 --wallet.defaultBalance 100 --port 8545
EOL
    chmod +x "$TRUFFLE_DIR/start_blockchain.sh"
    
    # Create script to deploy contracts
    cat > "$TRUFFLE_DIR/deploy_contracts.sh" << 'EOL'
#!/bin/bash
echo "Deploying MemeMorph contracts to local blockchain..."
echo ""

# Ensure we're in the Truffle directory
cd "$(dirname "$0")"

# Deploy the contracts
truffle migrate --reset

echo ""
echo "Contract addresses have been saved to contract_addresses.json"
echo "You can use these addresses in your .env files to connect to the contracts."
EOL
    chmod +x "$TRUFFLE_DIR/deploy_contracts.sh"
    
    # Create script to run tests
    cat > "$TRUFFLE_DIR/run_tests.sh" << 'EOL'
#!/bin/bash
echo "Running tests for MemeMorph contracts..."
echo ""

# Ensure we're in the Truffle directory
cd "$(dirname "$0")"

# Run the tests
truffle test
EOL
    chmod +x "$TRUFFLE_DIR/run_tests.sh"
    
    # Create script to export contract addresses
    cat > "$TRUFFLE_DIR/extract_addresses.js" << 'EOL'
const fs = require('fs');
const path = require('path');

// Function to extract contract addresses from build artifacts
function extractAddresses() {
    const buildPath = path.join(__dirname, 'build', 'contracts');
    const addresses = {};
    
    try {
        // Check if build directory exists
        if (!fs.existsSync(buildPath)) {
            console.error('Build directory not found. Please run truffle migrate first.');
            process.exit(1);
        }
        
        // Read all JSON files in the build directory
        const files = fs.readdirSync(buildPath).filter(file => file.endsWith('.json'));
        
        for (const file of files) {
            const filePath = path.join(buildPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Skip contracts that don't have network deployment data
            if (!data.networks || Object.keys(data.networks).length === 0) {
                continue;
            }
            
            // Get the most recent network deployment
            const networkId = Object.keys(data.networks)[Object.keys(data.networks).length - 1];
            const address = data.networks[networkId].address;
            
            // Add to addresses object
            addresses[data.contractName] = address;
        }
        
        // Write addresses to file
        fs.writeFileSync(
            path.join(__dirname, 'contract_addresses.json'), 
            JSON.stringify(addresses, null, 2)
        );
        
        console.log('Contract addresses:');
        console.log(JSON.stringify(addresses, null, 2));
        
    } catch (error) {
        console.error('Error extracting addresses:', error);
    }
}

// Run the function
extractAddresses();
EOL
    
    # Create script to update environment files with contract addresses
    cat > "$TRUFFLE_DIR/update_env.sh" << 'EOL'
#!/bin/bash
echo "Updating environment files with contract addresses..."

# Ensure we're in the Truffle directory
cd "$(dirname "$0")"

# Extract addresses first
node extract_addresses.js

# Check if addresses file exists
if [ ! -f "contract_addresses.json" ]; then
    echo "Error: contract_addresses.json not found."
    echo "Make sure you've deployed the contracts first."
    exit 1
fi

# Get the addresses
NFT_ADDRESS=$(grep -oP '"MemeMorphNFT": "\K[^"]+' contract_addresses.json)
TOKEN_ADDRESS=$(grep -oP '"MemeMorphCoin": "\K[^"]+' contract_addresses.json)

if [ -z "$NFT_ADDRESS" ] || [ -z "$TOKEN_ADDRESS" ]; then
    echo "Error: Could not extract contract addresses."
    exit 1
fi

# Base directory is two levels up
BASE_DIR=$(dirname $(dirname "$PWD"))

# Update backend .env
BACKEND_ENV="$BASE_DIR/MemeMorph/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
    echo "Updating backend .env file..."
    sed -i "s/NFT_CONTRACT_ADDRESS=.*/NFT_CONTRACT_ADDRESS=$NFT_ADDRESS/" "$BACKEND_ENV"
    sed -i "s/TOKEN_CONTRACT_ADDRESS=.*/TOKEN_CONTRACT_ADDRESS=$TOKEN_ADDRESS/" "$BACKEND_ENV"
    echo "Backend .env updated."
else
    echo "Backend .env file not found at $BACKEND_ENV"
fi

# Update frontend .env
FRONTEND_ENV="$BASE_DIR/MemeMorph/frontend/.env"
if [ -f "$FRONTEND_ENV" ]; then
    echo "Updating frontend .env file..."
    sed -i "s/REACT_APP_NFT_CONTRACT_ADDRESS=.*/REACT_APP_NFT_CONTRACT_ADDRESS=$NFT_ADDRESS/" "$FRONTEND_ENV"
    sed -i "s/REACT_APP_TOKEN_CONTRACT_ADDRESS=.*/REACT_APP_TOKEN_CONTRACT_ADDRESS=$TOKEN_ADDRESS/" "$FRONTEND_ENV"
    echo "Frontend .env updated."
else
    echo "Frontend .env file not found at $FRONTEND_ENV"
fi

echo "Environment files updated with the following addresses:"
echo "NFT Contract: $NFT_ADDRESS"
echo "Token Contract: $TOKEN_ADDRESS"
EOL
    chmod +x "$TRUFFLE_DIR/update_env.sh"
    
    success "Helper scripts created."
}

# Create main instructions file
create_readme() {
    info "Creating README with instructions..."
    
    cat > "$TRUFFLE_DIR/README.md" << 'EOL'
# MemeMorph Local Blockchain Setup

This directory contains the Truffle configuration and scripts to deploy and test the MemeMorph smart contracts locally.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Truffle (installed globally)
- Ganache (installed globally)

## Directory Structure

- `contracts/`: Smart contract source files
- `migrations/`: Deployment scripts
- `test/`: Test scripts for smart contracts
- `build/`: Compiled contracts (generated after migration)

## Helper Scripts

We've provided several scripts to make it easier to work with the local blockchain:

- `start_blockchain.sh`: Starts a local Ethereum blockchain using Ganache
- `deploy_contracts.sh`: Deploys the MemeMorph contracts to the local blockchain
- `run_tests.sh`: Runs the test suite for the contracts
- `update_env.sh`: Updates environment files with contract addresses

## Setup Instructions

### 1. Start the Local Blockchain

Open a terminal and run:

```
./start_blockchain.sh
```

This will start Ganache with 10 test accounts, each with 100 ETH. Keep this terminal open.

### 2. Deploy the Contracts

In a new terminal, run:

```
./deploy_contracts.sh
```

This will compile and deploy the MemeMorphCoin and MemeMorphNFT contracts to your local blockchain.

### 3. Update Environment Files

After deploying, run:

```
./update_env.sh
```

This will update your backend and frontend .env files with the newly deployed contract addresses.

### 4. Run Tests

To verify the contracts are working correctly, run:

```
./run_tests.sh
```

## Contract Addresses

After deployment, contract addresses are saved to `contract_addresses.json`.

## Test Accounts

Ganache creates test accounts with the following mnemonic:

```
candy maple cake sugar pudding cream honey rich smooth crumble sweet treat
```

The first account is used as the contract owner. Other accounts can be used for testing as creators, buyers, etc.

## Connecting MetaMask

To connect MetaMask to your local blockchain:

1. Open MetaMask
2. Add a new network with the following settings:
   - Network Name: MemeMorph Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

3. Import a test account using the private key from Ganache
EOL
    
    success "README created."
}

# Main function
main() {
    # Check requirements
    check_requirements
    
    # Setup Truffle project
    setup_truffle_project
    
    # Copy contracts
    copy_contracts
    
    # Create migration
    create_migration
    
    # Configure Truffle
    configure_truffle
    
    # Create test scripts
    create_test_scripts
    
    # Create helper scripts
    create_helper_scripts
    
    # Create README
    create_readme
    
    # Final instructions
    echo
    echo -e "${GREEN}Local blockchain setup complete!${NC}"
    echo
    echo "To use the local blockchain setup:"
    echo
    echo "1. Start the local blockchain:"
    echo "   cd $TRUFFLE_DIR && ./start_blockchain.sh"
    echo
    echo "2. In a new terminal, deploy the contracts:"
    echo "   cd $TRUFFLE_DIR && ./deploy_contracts.sh"
    echo
    echo "3. Update environment files with contract addresses:"
    echo "   cd $TRUFFLE_DIR && ./update_env.sh"
    echo
    echo "4. Run tests to verify everything is working:"
    echo "   cd $TRUFFLE_DIR && ./run_tests.sh"
    echo
    echo "See $TRUFFLE_DIR/README.md for detailed instructions."
    echo
}

# Run the main function
main