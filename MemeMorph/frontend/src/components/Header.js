import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { injectedConnector } from '../utils/web3Config';
import { switchNetwork, DEFAULT_NETWORK, getNetworkById } from '../utils/web3Config';

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
  gap: 10px;
`;

const WalletButton = styled.button`
  background-color: ${props => props.$isConnected ? 'var(--success-color)' : 'var(--primary-color)'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background-color: ${props => props.$isConnected ? 'var(--success-dark-color, #218838)' : 'var(--secondary-color)'};
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const NetworkBadge = styled.div`
  background-color: ${props => props.$isTestnet ? '#f7b924' : '#28a745'};
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 60px;
  right: 20px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 10px 0;
  min-width: 220px;
  z-index: 1000;
  display: ${props => props.$isVisible ? 'block' : 'none'};
  
  &:before {
    content: '';
    position: absolute;
    top: -8px;
    right: 30px;
    width: 16px;
    height: 16px;
    background: white;
    transform: rotate(45deg);
    box-shadow: -2px -2px 5px rgba(0, 0, 0, 0.04);
  }
`;

const DropdownItem = styled.div`
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &.disabled {
    color: #aaa;
    cursor: not-allowed;
    
    &:hover {
      background-color: transparent;
    }
  }
`;

const Header = ({ toggleSidebar }) => {
  const { active, account, chainId, activate, deactivate, library } = useWeb3React();
  const [connecting, setConnecting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [availableAccounts, setAvailableAccounts] = useState([]);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && window.ethereum;

  // Effect to update network information when connected
  useEffect(() => {
    if (active && chainId && window.ethereum) {
      const network = getNetworkById(chainId);
      setCurrentNetwork(network);
    } else {
      setCurrentNetwork(null);
    }
  }, [active, chainId]);

  // Effect to fetch wallet balance
  useEffect(() => {
    const getBalance = async () => {
      if (active && library && account) {
        try {
          const balance = await library.getBalance(account);
          setWalletBalance(ethers.utils.formatEther(balance));
        } catch (error) {
          console.error('Error fetching balance:', error);
          setWalletBalance(null);
        }
      } else {
        setWalletBalance(null);
      }
    };

    getBalance();
  }, [active, library, account]);

  // Effect to fetch all available accounts from MetaMask
  useEffect(() => {
    const fetchAccounts = async () => {
      if (isMetaMaskInstalled) {
        try {
          // Try to get all accounts, not just the connected ones
          // This requires user interaction, so we'll only do it when it's prompted
          let accounts = [];
          
          if (active) {
            // If already connected, get the accounts that are available
            accounts = await window.ethereum.request({ method: 'eth_accounts' });
            setAvailableAccounts(accounts);
          }
        } catch (error) {
          console.error('Error fetching accounts:', error);
        }
      }
    };
    
    fetchAccounts();
    
    // Also refresh accounts when the dropdown is opened
    if (menuOpen && isMetaMaskInstalled) {
      fetchAccounts();
    }
  }, [isMetaMaskInstalled, active, menuOpen]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          deactivate();
        } else {
          // Update available accounts
          setAvailableAccounts(accounts);
          
          // If we have accounts but current account is not among them,
          // use the first available account to avoid disconnect state
          if (accounts.length > 0 && 
              account && 
              !accounts.find(acc => acc.toLowerCase() === account.toLowerCase())) {
            // This will trigger a re-render with the first available account
            // No need to call activate() as MetaMask has already done that
            console.log('Account changed to:', accounts[0]);
          }
        }
      };
      
      const handleDisconnect = () => {
        // Handle wallet disconnect
        deactivate();
        setMenuOpen(false);
      };
      
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', handleDisconnect);
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [deactivate]);

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    
    setConnecting(true);
    try {
      // Request accounts from MetaMask - this will prompt the user if needed
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts'
      });
      
      // Set available accounts
      setAvailableAccounts(accounts);
      
      // Activate Web3React with injected connector
      await activate(injectedConnector);
      
      // Check if we need to switch networks
      const chainId = parseInt(window.ethereum.chainId, 16);
      const networkConfig = getNetworkById(chainId);
      setCurrentNetwork(networkConfig);
      
      const targetNetwork = DEFAULT_NETWORK;
      
      if (window.ethereum && !networkConfig) {
        try {
          await switchNetwork(targetNetwork);
        } catch (switchError) {
          console.error('Failed to switch network:', switchError);
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is unlocked and try again.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    try {
      deactivate();
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleWalletClick = (e) => {
    // Prevent the click event from propagating
    e.stopPropagation();
    
    if (active) {
      setMenuOpen(!menuOpen);
    } else {
      connectWallet();
    }
  };

  const switchToNetwork = async (networkName) => {
    try {
      await switchNetwork(networkName);
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert(`Failed to switch to ${networkName} network`);
    }
  };

  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if the click was outside the dropdown and wallet button
      const target = event.target;
      const dropdown = document.getElementById('wallet-dropdown');
      const walletButton = document.getElementById('wallet-button');
      
      if (dropdown && walletButton && 
          !dropdown.contains(target) && 
          !walletButton.contains(target)) {
        setMenuOpen(false);
      }
    };
    
    if (menuOpen) {
      // Use a small timeout to ensure the click that opened the menu
      // doesn't immediately close it
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen]);

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
        {active && currentNetwork && (
          <NetworkBadge $isTestnet={currentNetwork.isTestnet}>
            {currentNetwork.name}
          </NetworkBadge>
        )}
        
        <WalletButton 
          id="wallet-button"
          $isConnected={active}
          onClick={handleWalletClick}
          disabled={connecting}
        >
          {connecting ? (
            'Connecting...'
          ) : active ? (
            <>
              <span>{shortenAddress(account)}</span>
              {menuOpen ? '▲' : '▼'}
            </>
          ) : (
            <>
              {isMetaMaskInstalled ? 'Connect Your Wallet' : 'Install MetaMask'}
            </>
          )}
        </WalletButton>
        
        {active && (
          <DropdownMenu id="wallet-dropdown" $isVisible={menuOpen} onClick={(e) => e.stopPropagation()}>
            {/* Current Account Info */}
            <DropdownItem>
              <strong>Account:</strong> {shortenAddress(account)}
            </DropdownItem>
            {walletBalance && (
              <DropdownItem>
                <strong>Balance:</strong> {parseFloat(walletBalance).toFixed(4)} ETH
              </DropdownItem>
            )}
            <DropdownItem>
              <strong>Network:</strong> {currentNetwork?.name || 'Unknown'}
            </DropdownItem>
            
            {/* Available Accounts Section */}
            {availableAccounts.length > 1 && (
              <>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
                <DropdownItem style={{ fontWeight: 'bold' }}>
                  Switch Account
                </DropdownItem>
                
                {availableAccounts.map((acc) => (
                  <DropdownItem 
                    key={acc}
                    onClick={async () => {
                      // Only trigger a switch if this isn't the current account
                      if (acc.toLowerCase() !== account.toLowerCase()) {
                        try {
                          // This will refresh the Web3React context with the new account
                          await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ 
                              chainId: window.ethereum.chainId 
                            }],
                          });
                          
                          // The proper way to switch accounts is to show the MetaMask UI
                          // This will allow the user to select the account manually
                          await window.ethereum.request({
                            method: 'wallet_requestPermissions',
                            params: [{
                              eth_accounts: {}
                            }]
                          });
                          
                          // MetaMask will handle the account switching via its UI
                          // We don't need to call a specific API for this
                          
                          // Close the menu
                          setMenuOpen(false);
                        } catch (error) {
                          console.error('Failed to switch account:', error);
                        }
                      }
                    }}
                    style={{
                      backgroundColor: acc.toLowerCase() === account.toLowerCase() ? '#f5f9ff' : 'transparent',
                      fontWeight: acc.toLowerCase() === account.toLowerCase() ? 'bold' : 'normal'
                    }}
                  >
                    {shortenAddress(acc)}
                    {acc.toLowerCase() === account.toLowerCase() && ' (Current)'}
                  </DropdownItem>
                ))}
              </>
            )}
            
            {/* Switch Wallet Option */}
            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
            <DropdownItem style={{ fontWeight: 'bold' }}>
              Wallet Options
            </DropdownItem>
            
            <DropdownItem onClick={async () => {
              try {
                // Get all accounts from MetaMask
                const accounts = await window.ethereum.request({ 
                  method: 'eth_requestAccounts' 
                });
                setAvailableAccounts(accounts);
                
                // Show MetaMask wallet selection UI
                await window.ethereum.request({
                  method: 'wallet_requestPermissions',
                  params: [{
                    eth_accounts: {}
                  }]
                });
                setMenuOpen(false);
              } catch (error) {
                console.error('Failed to open wallet selection:', error);
              }
            }}>
              Switch Wallet Account
            </DropdownItem>
            
            {/* Available Accounts Section */}
            {availableAccounts.length > 0 && (
              <>
                <DropdownItem style={{ fontWeight: 'bold', marginTop: '8px' }}>
                  Available Accounts
                </DropdownItem>
                
                {availableAccounts.map((acc) => (
                  <DropdownItem 
                    key={acc}
                    onClick={async () => {
                      // Only trigger a switch if this isn't the current account
                      if (acc.toLowerCase() !== account.toLowerCase()) {
                        try {
                          // Show the permissions UI to select this account
                          await window.ethereum.request({
                            method: 'wallet_requestPermissions',
                            params: [{
                              eth_accounts: {}
                            }]
                          });
                          
                          // The user will select the account in the MetaMask UI
                          setMenuOpen(false);
                        } catch (error) {
                          console.error('Failed to switch account:', error);
                        }
                      }
                    }}
                    style={{
                      backgroundColor: acc.toLowerCase() === account.toLowerCase() ? '#f5f9ff' : 'transparent',
                      fontWeight: acc.toLowerCase() === account.toLowerCase() ? 'bold' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{shortenAddress(acc)}</span>
                    {acc.toLowerCase() === account.toLowerCase() && (
                      <span style={{ 
                        backgroundColor: 'var(--success-color)', 
                        color: 'white', 
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        marginLeft: '8px'
                      }}>
                        Active
                      </span>
                    )}
                  </DropdownItem>
                ))}
              </>
            )}
            
            {/* Network Selection */}
            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
            <DropdownItem style={{ fontWeight: 'bold' }}>
              Switch Network
            </DropdownItem>
            
            <DropdownItem onClick={() => switchToNetwork('local')}>
              Local Testnet
            </DropdownItem>
            <DropdownItem onClick={() => switchToNetwork('sepolia')}>
              Sepolia Testnet
            </DropdownItem>
            <DropdownItem onClick={() => switchToNetwork('goerli')}>
              Goerli Testnet
            </DropdownItem>
            
            {/* Disconnect Option */}
            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
            
            <DropdownItem onClick={disconnectWallet}>
              Disconnect Wallet
            </DropdownItem>
          </DropdownMenu>
        )}
      </Controls>
    </HeaderContainer>
  );
};

export default Header;