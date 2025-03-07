# MemeMorph Sepolia Deployment

This directory contains the contracts and deployment scripts for the MemeMorph platform on the Sepolia testnet.

## Prerequisites

- Node.js and npm installed
- Ethereum wallet with Sepolia ETH
- API keys for Infura/Alchemy and Etherscan

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your wallet's private key and API keys:
   ```
   DEPLOYER_PRIVATE_KEY=your_private_key_without_0x_prefix
   INFURA_PROJECT_ID=your_infura_project_id
   SEPOLIA_RPC_URL=your_sepolia_rpc_url
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Deployment

To deploy the contracts to Sepolia:

```bash
node deploy.js
```

This will:
1. Deploy the MemeMorphCoin (MMC) ERC20 token
2. Deploy the MemeMorphNFT contract
3. Configure the contracts
4. Create a deployment summary file

## Contract Verification

After deployment, the contracts will be automatically verified on Etherscan if you've provided an Etherscan API key.

## Security Notice

**IMPORTANT:** Never commit your `.env` file to version control as it contains sensitive information like your private key. This repository includes `.env` in the `.gitignore` file to prevent accidental commits.

## Contract Addresses

After deploying, the contract addresses will be saved in a deployment summary file in the project root directory.