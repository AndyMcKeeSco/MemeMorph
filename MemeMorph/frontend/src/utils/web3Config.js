import { InjectedConnector } from '@web3-react/injected-connector';
import { ethers } from 'ethers';

// NetworkID/ChainID mappings
export const NETWORKS = {
  sepolia: {
    name: 'Sepolia Test Network',
    chainId: 11155111,
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_PROJECT_ID}`,
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true
  },
  goerli: {
    name: 'Goerli Test Network',
    chainId: 5,
    rpcUrl: `https://goerli.infura.io/v3/${process.env.REACT_APP_INFURA_PROJECT_ID}`,
    explorerUrl: 'https://goerli.etherscan.io',
    isTestnet: true
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_PROJECT_ID}`,
    explorerUrl: 'https://etherscan.io',
    isTestnet: false
  },
  local: {
    name: 'Local Development Chain',
    chainId: 1337,
    rpcUrl: 'http://localhost:8545',
    explorerUrl: '',
    isTestnet: true
  }
};

// Define supported networks for connector
const supportedChainIds = Object.values(NETWORKS).map(network => network.chainId);

// Initialize the Injected (MetaMask) connector with special handling for events
export const injectedConnector = new InjectedConnector({
  supportedChainIds
});

// Apply patches to handle deprecated MetaMask methods and events
// This will prevent warnings when MetaMask is connected
if (typeof window !== 'undefined' && window.ethereum) {
  // Store the original methods
  const originalOn = window.ethereum.on.bind(window.ethereum);
  const originalRemoveListener = window.ethereum.removeListener.bind(window.ethereum);
  const originalSend = window.ethereum.send?.bind(window.ethereum);
  
  // Override the on method to map deprecated events
  window.ethereum.on = function(eventName, listener) {
    if (eventName === 'close') {
      console.warn('The event "close" is deprecated. Using "disconnect" instead.');
      return originalOn('disconnect', listener);
    }
    if (eventName === 'networkChanged') {
      console.warn('The event "networkChanged" is deprecated. Using "chainChanged" instead.');
      return originalOn('chainChanged', listener);
    }
    return originalOn(eventName, listener);
  };
  
  // Override the removeListener method to handle the mapping correctly
  window.ethereum.removeListener = function(eventName, listener) {
    if (eventName === 'close') {
      return originalRemoveListener('disconnect', listener);
    }
    if (eventName === 'networkChanged') {
      return originalRemoveListener('chainChanged', listener);
    }
    return originalRemoveListener(eventName, listener);
  };
  
  // Patch the send method to use request instead
  if (typeof window.ethereum.send === 'function') {
    window.ethereum.send = function(method, params) {
      if (typeof method === 'string') {
        console.warn('ethereum.send(...) is deprecated. Using ethereum.request(...) instead.');
        return window.ethereum.request({ method, params });
      } else {
        // Handle the case where first parameter is an object
        console.warn('ethereum.send(...) is deprecated. Using ethereum.request(...) instead.');
        return window.ethereum.request(method);
      }
    };
  }
}

// Default network from environment variable
export const DEFAULT_NETWORK = process.env.REACT_APP_DEFAULT_NETWORK || 'sepolia';

// Contract addresses - hardcoded until environment variables are set up
export const NFT_CONTRACT_ADDRESS = '0x80D97cccf37c95493057A492A7D667A74f57F5cc';
export const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

// Get network configuration by network ID
export const getNetworkById = (chainId) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};

// Get network configuration by name
export const getNetworkByName = (networkName) => {
  return NETWORKS[networkName] || NETWORKS[DEFAULT_NETWORK];
};

// Function to switch the network in MetaMask
export const switchNetwork = async (networkName) => {
  const network = getNetworkByName(networkName);
  if (!network) {
    throw new Error(`Network ${networkName} not supported`);
  }
  
  try {
    // Request switch to the desired chain
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ethers.utils.hexValue(network.chainId) }],
    });
    return true;
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ethers.utils.hexValue(network.chainId),
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: network.explorerUrl ? [network.explorerUrl] : null,
            },
          ],
        });
        return true;
      } catch (addError) {
        throw addError;
      }
    }
    throw switchError;
  }
};

// Contract ABIs
export const loadContractABIs = async () => {
  try {
    const nftABI = await fetch('/contracts/MemeMorphNFT_abi.json').then(res => res.json());
    const tokenABI = await fetch('/contracts/MemeMorphCoin_abi.json').then(res => res.json());
    
    return {
      nftABI,
      tokenABI
    };
  } catch (error) {
    console.error('Error loading contract ABIs:', error);
    return {
      nftABI: null,
      tokenABI: null
    };
  }
};

// Create contract instances
export const getContracts = async (provider) => {
  if (!provider) return { nftContract: null, tokenContract: null };
  
  try {
    const signer = provider.getSigner();
    const { nftABI, tokenABI } = await loadContractABIs();
    
    if (!nftABI || !tokenABI) {
      throw new Error('Contract ABIs not loaded');
    }
    
    const nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      nftABI,
      signer
    );
    
    const tokenContract = new ethers.Contract(
      TOKEN_CONTRACT_ADDRESS,
      tokenABI,
      signer
    );
    
    return { nftContract, tokenContract };
  } catch (error) {
    console.error('Error initializing contracts:', error);
    return { nftContract: null, tokenContract: null };
  }
};