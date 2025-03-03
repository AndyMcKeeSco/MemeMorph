import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import NFTCollection from './NFTCollection';
import ClaimNFT from './ClaimNFT';
import { getContracts } from '../utils/web3Config';
import { PAGES } from '../constants';

const MainContainer = styled.main`
  grid-area: main;
  padding: 20px;
  overflow-y: auto;
`;

const WelcomeSection = styled.section`
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border-radius: 10px;
  padding: 40px;
  margin-bottom: 30px;
  color: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 15px;
`;

const WelcomeDescription = styled.p`
  font-size: 1.1rem;
  margin-bottom: 25px;
  max-width: 700px;
`;

const Button = styled.button`
  background-color: white;
  color: var(--primary-color);
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: var(--light-color);
    transform: translateY(-2px);
  }
`;

const FeaturesSection = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const FeatureCard = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }
`;

const FeatureIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 15px;
`;

const FeatureTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 10px;
`;

const FeatureDescription = styled.p`
  color: #666;
  line-height: 1.5;
`;

// Page components
const HomePage = ({ active, contracts }) => (
  <>
    <WelcomeSection>
      <WelcomeTitle>Welcome to MemeMorph</WelcomeTitle>
      <WelcomeDescription>
        Create, customize, and trade your own meme NFTs with AI-powered tools. 
        Join the revolution of digital meme ownership on the blockchain.
      </WelcomeDescription>
      <Button>
        {active ? 'Create Your First Meme NFT' : 'Learn More'}
      </Button>
    </WelcomeSection>
    
    <FeaturesSection>
      <FeatureCard>
        <FeatureIcon>✨</FeatureIcon>
        <FeatureTitle>AI-Powered Creation</FeatureTitle>
        <FeatureDescription>
          Generate unique memes with our advanced AI tools. Customize templates or create entirely new designs.
        </FeatureDescription>
      </FeatureCard>
      
      <FeatureCard>
        <FeatureIcon>🔗</FeatureIcon>
        <FeatureTitle>Blockchain Ownership</FeatureTitle>
        <FeatureDescription>
          Secure your meme creations as NFTs on the blockchain. Verifiable ownership that lasts forever.
        </FeatureDescription>
      </FeatureCard>
      
      <FeatureCard>
        <FeatureIcon>💰</FeatureIcon>
        <FeatureTitle>Trade with MMC Tokens</FeatureTitle>
        <FeatureDescription>
          Buy and sell NFTs using MemeMorphCoin (MMC), our platform's native token with low transaction fees.
        </FeatureDescription>
      </FeatureCard>
    </FeaturesSection>
  </>
);

const CollectionPage = ({ contracts }) => (
  <NFTCollection nftContract={contracts.nftContract} />
);

const ExplorePage = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <h2>Explore Page</h2>
    <p>Discover trending memes and popular creators</p>
    <p>Coming soon...</p>
  </div>
);

const CreatePage = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <h2>Create Page</h2>
    <p>Create your own unique meme NFTs</p>
    <p>Coming soon...</p>
  </div>
);

const ClaimPage = ({ contracts }) => (
  <ClaimNFT nftContract={contracts.nftContract} />
);

const MarketplacePage = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <h2>Marketplace</h2>
    <p>Buy and sell meme NFTs</p>
    <p>Coming soon...</p>
  </div>
);

const SettingsPage = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <h2>Settings</h2>
    <p>Configure your account and preferences</p>
    <p>Coming soon...</p>
  </div>
);

const HelpPage = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <h2>Help & Support</h2>
    <p>Learn how to use MemeMorph</p>
    <p>Coming soon...</p>
  </div>
);

const MainContent = ({ activePage }) => {
  const { active, library } = useWeb3React();
  const [contracts, setContracts] = useState({ nftContract: null, tokenContract: null });
  
  // Initialize contracts when wallet is connected
  useEffect(() => {
    const initContracts = async () => {
      if (active && library) {
        try {
          const { nftContract, tokenContract } = await getContracts(library);
          setContracts({ nftContract, tokenContract });
        } catch (error) {
          console.error("Failed to initialize contracts:", error);
        }
      } else {
        setContracts({ nftContract: null, tokenContract: null });
      }
    };
    
    initContracts();
  }, [active, library]);

  // Render the appropriate page based on activePage
  const renderPage = () => {
    switch (activePage) {
      case PAGES.HOME:
        return <HomePage active={active} contracts={contracts} />;
      case PAGES.COLLECTION:
        return <CollectionPage contracts={contracts} />;
      case PAGES.EXPLORE:
        return <ExplorePage />;
      case PAGES.CREATE:
        return <CreatePage />;
      case PAGES.CLAIM:
        return <ClaimPage contracts={contracts} />;
      case PAGES.MARKETPLACE:
        return <MarketplacePage />;
      case PAGES.SETTINGS:
        return <SettingsPage />;
      case PAGES.HELP:
        return <HelpPage />;
      default:
        return <HomePage active={active} contracts={contracts} />;
    }
  };

  return (
    <MainContainer>
      {renderPage()}
    </MainContainer>
  );
};

export default MainContent;