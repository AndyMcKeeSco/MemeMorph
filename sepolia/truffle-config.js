require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    sepolia: {
      provider: () => {
        if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
          throw new Error("Missing DEPLOYER_PRIVATE_KEY or SEPOLIA_RPC_URL in .env file");
        }
        console.log(`Preparing to use Sepolia testnet`);
        return new HDWalletProvider({
          privateKeys: [process.env.DEPLOYER_PRIVATE_KEY],
          providerOrUrl: process.env.SEPOLIA_RPC_URL,
          pollingInterval: 30000 // Much higher polling interval to avoid rate limits
        });
      },
      network_id: 11155111,   // Sepolia's network id
      gas: 5500000,           // Gas limit used for deploys
      gasPrice: 20000000000,  // 20 gwei
      confirmations: 2,       // # of confirmations to wait between deployments
      timeoutBlocks: 200,     // # of blocks before a deployment times out
      skipDryRun: true,       // Skip dry run before migrations? (default: false for public nets)
      networkCheckTimeout: 90000, // Increase timeout for network connection
      timeoutBlocks: 500      // Increase timeout in blocks
    },
  },
  
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.21",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  
  // Plugins for verification
  plugins: ['truffle-plugin-verify'],
  
  // API Keys
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }
};
