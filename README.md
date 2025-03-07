# MemeMorph

MemeMorph is a web application that enables users to create, customize, and trade meme NFTs. It features a Python Flask backend for AI-powered image processing, connected to a React frontend that interacts with Web3 technologies to mint and manage NFTs on the blockchain.

## Project Structure

- **backend/** - Python Flask API for AI image processing
- **contracts/** - Solidity smart contracts for NFT minting and trading
- **frontend/** - React web application

## Getting Started

### Backend Setup
```bash
cd MemeMorph/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd MemeMorph/frontend
npm install
npm start
```

### Smart Contracts
```bash
cd MemeMorph/contracts
# Contract deployment instructions to be added
```

## Features

- AI-powered meme generation and customization
- NFT minting capabilities
- Marketplace for trading meme NFTs
- User collections and profiles

## License

MIT