import React from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { injectedConnector } from '../utils/web3Config';
import { switchNetwork, DEFAULT_NETWORK } from '../utils/web3Config';

const HeaderContainer = styled.header`
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--primary-color);
  cursor: pointer;
`;

const MenuToggle = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  color: var(--dark-color);
  margin-right: 20px;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
`;

const WalletButton = styled.button`
  background-color: ${props => props.connected ? 'var(--success-color)' : 'var(--primary-color)'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: ${props => props.connected ? 'var(--success-color)' : 'var(--secondary-color)'};
  }
`;

const Header = ({ toggleSidebar }) => {
  const { active, account, activate, deactivate } = useWeb3React();

  const connectWallet = async () => {
    try {
      await activate(injectedConnector);
      
      // Check if we need to switch networks
      const chainId = parseInt(window.ethereum.chainId, 16);
      const targetNetwork = DEFAULT_NETWORK;
      
      if (window.ethereum && chainId !== targetNetwork) {
        try {
          await switchNetwork(targetNetwork);
        } catch (switchError) {
          console.error('Failed to switch network:', switchError);
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    try {
      deactivate();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleWalletClick = () => {
    if (active) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <HeaderContainer>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <MenuToggle onClick={toggleSidebar}>
          ☰
        </MenuToggle>
        <Logo>
          MemeMorph
        </Logo>
      </div>
      
      <Controls>
        <WalletButton 
          connected={active} 
          onClick={handleWalletClick}
        >
          {active ? shortenAddress(account) : 'Connect Your Wallet'}
        </WalletButton>
      </Controls>
    </HeaderContainer>
  );
};

export default Header;