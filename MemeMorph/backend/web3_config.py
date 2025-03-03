import os
import json
from web3 import Web3
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Network configuration constants
NETWORKS = {
    "local": {
        "name": "Local Development",
        "provider_uri": "http://localhost:8545",
        "chain_id": 1337,
        "explorer_url": "http://localhost:8545",
        "is_testnet": True
    },
    "sepolia": {
        "name": "Sepolia",
        "provider_uri": f"https://sepolia.infura.io/v3/{os.getenv('INFURA_PROJECT_ID')}",
        "chain_id": 11155111,
        "explorer_url": "https://sepolia.etherscan.io",
        "is_testnet": True
    },
    "goerli": {
        "name": "Goerli",
        "provider_uri": f"https://goerli.infura.io/v3/{os.getenv('INFURA_PROJECT_ID')}",
        "chain_id": 5,
        "explorer_url": "https://goerli.etherscan.io",
        "is_testnet": True
    },
    "mainnet": {
        "name": "Ethereum Mainnet",
        "provider_uri": f"https://mainnet.infura.io/v3/{os.getenv('INFURA_PROJECT_ID')}",
        "chain_id": 1,
        "explorer_url": "https://etherscan.io",
        "is_testnet": False
    }
}

# Default network from environment or use sepolia as fallback
ACTIVE_NETWORK = os.getenv('WEB3_NETWORK', 'sepolia')

# Ensure the network is valid
if ACTIVE_NETWORK not in NETWORKS:
    logger.warning(f"Invalid network {ACTIVE_NETWORK}, defaulting to sepolia")
    ACTIVE_NETWORK = 'sepolia'

# Load network configuration
network_config = NETWORKS[ACTIVE_NETWORK]

# Initialize Web3 provider
WEB3_PROVIDER_URI = os.getenv('WEB3_PROVIDER_URI', network_config['provider_uri'])
WEB3_CHAIN_ID = int(os.getenv('WEB3_CHAIN_ID', network_config['chain_id']))

# Contract addresses
NFT_CONTRACT_ADDRESS = os.getenv('NFT_CONTRACT_ADDRESS')
TOKEN_CONTRACT_ADDRESS = os.getenv('TOKEN_CONTRACT_ADDRESS')

# Wallet configuration
WALLET_PRIVATE_KEY = os.getenv('WALLET_PRIVATE_KEY')

# Initialize Web3
def get_web3():
    """Initialize and return a Web3 instance connected to the configured provider"""
    try:
        # Connect to the provider
        if WEB3_PROVIDER_URI.startswith('http'):
            web3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URI))
        elif WEB3_PROVIDER_URI.startswith('ws'):
            web3 = Web3(Web3.WebsocketProvider(WEB3_PROVIDER_URI))
        else:
            logger.error(f"Unsupported provider URI: {WEB3_PROVIDER_URI}")
            return None
        
        # Check connection
        if web3.is_connected():
            logger.info(f"Connected to {ACTIVE_NETWORK} network")
            return web3
        else:
            logger.error(f"Failed to connect to {ACTIVE_NETWORK} network")
            return None
    except Exception as e:
        logger.error(f"Error initializing Web3: {str(e)}")
        return None

# Load contract ABIs
def load_contract_abi(contract_name):
    """Load contract ABI from file"""
    try:
        abi_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'contracts',
            f'{contract_name}_abi.json'
        )
        with open(abi_path, 'r') as file:
            return json.load(file)
    except Exception as e:
        logger.error(f"Error loading ABI for {contract_name}: {str(e)}")
        return None

# Initialize contracts
def get_contract(web3, contract_name, contract_address):
    """Initialize and return a contract instance"""
    if not web3 or not contract_address:
        return None
    
    try:
        abi = load_contract_abi(contract_name)
        if not abi:
            return None
        
        contract = web3.eth.contract(address=contract_address, abi=abi)
        return contract
    except Exception as e:
        logger.error(f"Error initializing {contract_name} contract: {str(e)}")
        return None

# Function to get NFT contract
def get_nft_contract():
    """Get the MemeMorphNFT contract instance"""
    web3 = get_web3()
    if not web3:
        return None
    
    return get_contract(web3, 'MemeMorphNFT', NFT_CONTRACT_ADDRESS)

# Function to get token contract
def get_token_contract():
    """Get the MemeMorphCoin contract instance"""
    web3 = get_web3()
    if not web3:
        return None
    
    return get_contract(web3, 'MemeMorphCoin', TOKEN_CONTRACT_ADDRESS)

# Get network information for the frontend
def get_network_info():
    """Return network information for the frontend"""
    return {
        "network": ACTIVE_NETWORK,
        "name": network_config['name'],
        "chainId": network_config['chain_id'],
        "explorerUrl": network_config['explorer_url'],
        "isTestnet": network_config['is_testnet'],
        "nftContractAddress": NFT_CONTRACT_ADDRESS,
        "tokenContractAddress": TOKEN_CONTRACT_ADDRESS
    }