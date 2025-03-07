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