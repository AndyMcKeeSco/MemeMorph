require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');

// Function to deploy contracts
async function deploy() {
  try {
    console.log('Starting deployment to Sepolia...');
    
    // Run truffle migrate
    const output = execSync('npx truffle migrate --network sepolia --reset').toString();
    console.log(output);
    
    // Extract contract addresses from deployment file
    const deploymentFiles = fs.readdirSync('.').filter(file => file.startsWith('deployment-sepolia'));
    
    if (deploymentFiles.length === 0) {
      console.error('No deployment file found!');
      return;
    }
    
    // Get the latest deployment file
    const latestDeployment = deploymentFiles.sort().pop();
    const deploymentData = JSON.parse(fs.readFileSync(latestDeployment, 'utf8'));
    
    console.log('\nDeployment Summary:');
    console.log('===================');
    console.log(`Network: Sepolia (${deploymentData.network})`);
    console.log(`Deployer: ${deploymentData.deployer}`);
    console.log(`MemeMorphCoin: ${deploymentData.MemeMorphCoin}`);
    console.log(`MemeMorphNFT: ${deploymentData.MemeMorphNFT}`);
    console.log('\nVerifying contracts on Etherscan...');
    
    // Verify contracts on Etherscan if API key is provided
    if (process.env.ETHERSCAN_API_KEY) {
      try {
        console.log('Verifying MemeMorphCoin...');
        execSync(`npx truffle run verify MemeMorphCoin@${deploymentData.MemeMorphCoin} --network sepolia`);
        
        console.log('Verifying MemeMorphNFT...');
        execSync(`npx truffle run verify MemeMorphNFT@${deploymentData.MemeMorphNFT} --network sepolia`);
        
        console.log('Contracts verified successfully!');
      } catch (error) {
        console.error('Error during verification:', error.message);
        console.log('You can manually verify contracts on Etherscan later.');
      }
    } else {
      console.log('Etherscan API key not provided. Skipping verification.');
    }
    
    // Update environment files
    updateEnvironmentFiles(deploymentData);
    
    console.log('\nDeployment complete!');
  } catch (error) {
    console.error('Deployment failed:', error.message);
  }
}

// Function to update environment files
function updateEnvironmentFiles(deploymentData) {
  console.log('\nUpdating environment files...');
  
  // Update backend .env
  const backendEnvPath = '../MemeMorph/backend/.env';
  if (fs.existsSync(backendEnvPath)) {
    let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    
    // Update or add contract addresses
    if (backendEnv.includes('NFT_CONTRACT_ADDRESS=')) {
      backendEnv = backendEnv.replace(/NFT_CONTRACT_ADDRESS=.*/, `NFT_CONTRACT_ADDRESS=${deploymentData.MemeMorphNFT}`);
    } else {
      backendEnv += `\nNFT_CONTRACT_ADDRESS=${deploymentData.MemeMorphNFT}`;
    }
    
    if (backendEnv.includes('TOKEN_CONTRACT_ADDRESS=')) {
      backendEnv = backendEnv.replace(/TOKEN_CONTRACT_ADDRESS=.*/, `TOKEN_CONTRACT_ADDRESS=${deploymentData.MemeMorphCoin}`);
    } else {
      backendEnv += `\nTOKEN_CONTRACT_ADDRESS=${deploymentData.MemeMorphCoin}`;
    }
    
    // Add network info
    if (!backendEnv.includes('NETWORK=')) {
      backendEnv += `\nNETWORK=sepolia`;
    } else {
      backendEnv = backendEnv.replace(/NETWORK=.*/, `NETWORK=sepolia`);
    }
    
    fs.writeFileSync(backendEnvPath, backendEnv);
    console.log('Updated backend .env file');
  }
  
  // Update frontend .env
  const frontendEnvPath = '../MemeMorph/frontend/.env';
  if (fs.existsSync(frontendEnvPath)) {
    let frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
    
    // Update or add contract addresses
    if (frontendEnv.includes('REACT_APP_NFT_CONTRACT_ADDRESS=')) {
      frontendEnv = frontendEnv.replace(/REACT_APP_NFT_CONTRACT_ADDRESS=.*/, `REACT_APP_NFT_CONTRACT_ADDRESS=${deploymentData.MemeMorphNFT}`);
    } else {
      frontendEnv += `\nREACT_APP_NFT_CONTRACT_ADDRESS=${deploymentData.MemeMorphNFT}`;
    }
    
    if (frontendEnv.includes('REACT_APP_TOKEN_CONTRACT_ADDRESS=')) {
      frontendEnv = frontendEnv.replace(/REACT_APP_TOKEN_CONTRACT_ADDRESS=.*/, `REACT_APP_TOKEN_CONTRACT_ADDRESS=${deploymentData.MemeMorphCoin}`);
    } else {
      frontendEnv += `\nREACT_APP_TOKEN_CONTRACT_ADDRESS=${deploymentData.MemeMorphCoin}`;
    }
    
    // Add network info
    if (!frontendEnv.includes('REACT_APP_NETWORK=')) {
      frontendEnv += `\nREACT_APP_NETWORK=sepolia`;
    } else {
      frontendEnv = frontendEnv.replace(/REACT_APP_NETWORK=.*/, `REACT_APP_NETWORK=sepolia`);
    }
    
    // Add Infura key
    if (!frontendEnv.includes('REACT_APP_INFURA_KEY=')) {
      frontendEnv += `\nREACT_APP_INFURA_KEY=${process.env.INFURA_API_KEY}`;
    } else {
      frontendEnv = frontendEnv.replace(/REACT_APP_INFURA_KEY=.*/, `REACT_APP_INFURA_KEY=${process.env.INFURA_API_KEY}`);
    }
    
    fs.writeFileSync(frontendEnvPath, frontendEnv);
    console.log('Updated frontend .env file');
  }
  
  // Save deployment summary to project root
  const summaryPath = '../sepolia_deployment.json';
  fs.writeFileSync(summaryPath, JSON.stringify({
    network: 'sepolia',
    chainId: 11155111,
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
    blockExplorer: 'https://sepolia.etherscan.io',
    contracts: {
      MemeMorphCoin: deploymentData.MemeMorphCoin,
      MemeMorphNFT: deploymentData.MemeMorphNFT
    },
    deployedAt: new Date().toISOString()
  }, null, 2));
  console.log('Created deployment summary at sepolia_deployment.json');
}

// Run the deployment
deploy();
