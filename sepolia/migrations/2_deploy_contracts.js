require('dotenv').config();
const MemeMorphCoin = artifacts.require("MemeMorphCoin");
const MemeMorphNFT = artifacts.require("MemeMorphNFT");

module.exports = async function(deployer, network, accounts) {
  // Load parameters from environment
  const initialSupply = process.env.INITIAL_SUPPLY || 1000000;
  const initialMintFee = process.env.MINT_FEE || 10;
  const initialTransactionFee = process.env.TRANSACTION_FEE || 2;
  
  // Use the deployer's address as default wallet
  let defaultWallet;
  if (network === 'development') {
    defaultWallet = accounts[0];
  } else {
    // For testnets and mainnet, use the address from the private key
    defaultWallet = accounts[0]; // Use the account provided by truffle
    console.log(`Using deployer address as default wallet: ${defaultWallet}`);
  }

  console.log(`Deploying with address: ${defaultWallet}`);
  console.log(`Initial supply: ${initialSupply}`);
  console.log(`Initial mint fee: ${initialMintFee}`);
  console.log(`Initial transaction fee: ${initialTransactionFee}`);
  
  // Deploy MemeMorphCoin first
  await deployer.deploy(MemeMorphCoin, initialSupply);
  const coinInstance = await MemeMorphCoin.deployed();
  
  console.log(`MemeMorphCoin deployed at: ${coinInstance.address}`);
  
  // Deploy MemeMorphNFT with the coin address and default wallet
  await deployer.deploy(
    MemeMorphNFT, 
    coinInstance.address, 
    initialMintFee, 
    initialTransactionFee,
    defaultWallet
  );
  const nftInstance = await MemeMorphNFT.deployed();
  
  console.log(`MemeMorphNFT deployed at: ${nftInstance.address}`);
  
  // Add the NFT contract as a minter for MemeMorphCoin
  await coinInstance.addMinter(nftInstance.address);
  console.log(`Added ${nftInstance.address} as a minter for MemeMorphCoin`);
  
  // Save the deployed addresses
  const fs = require('fs');
  const deploymentInfo = {
    network,
    deployer: defaultWallet,
    MemeMorphCoin: coinInstance.address,
    MemeMorphNFT: nftInstance.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `deployment-${network}-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment information saved to deployment-${network} file.`);
};
