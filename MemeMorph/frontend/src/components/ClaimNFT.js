import React, { useState } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';

const ClaimContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: var(--dark-color);
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 10px;
  }
`;

const ClaimForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 500px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--dark-color);
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
  }
`;

const Button = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--secondary-color);
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  padding: 15px;
  margin-top: 20px;
  border-radius: 4px;
  text-align: center;
  
  &.success {
    background-color: rgba(40, 167, 69, 0.1);
    color: #28a745;
    border: 1px solid #28a745;
  }
  
  &.error {
    background-color: rgba(220, 53, 69, 0.1);
    color: #dc3545;
    border: 1px solid #dc3545;
  }
  
  &.info {
    background-color: rgba(13, 110, 253, 0.1);
    color: #0d6efd;
    border: 1px solid #0d6efd;
  }
`;

const HelperText = styled.p`
  color: #6c757d;
  font-size: 0.9rem;
  margin-top: 5px;
`;

const ClaimNFT = ({ nftContract }) => {
  const { active, account } = useWeb3React();
  const [tokenId, setTokenId] = useState('');
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleTokenIdChange = (e) => {
    // Only allow numeric input
    if (/^\d*$/.test(e.target.value)) {
      setTokenId(e.target.value);
    }
  };

  const handleSecretChange = (e) => {
    setSecret(e.target.value);
  };

  const validateForm = () => {
    if (!tokenId) {
      setStatus({
        type: 'error',
        message: 'Please enter a valid Token ID'
      });
      return false;
    }

    if (!secret) {
      setStatus({
        type: 'error',
        message: 'Please enter the secret code'
      });
      return false;
    }

    return true;
  };

  const checkIfNFTIsClaimable = async () => {
    try {
      // First, check if the NFT exists and is owned by the default wallet
      const isClaimable = await nftContract.claimable(tokenId);
      
      if (!isClaimable) {
        setStatus({
          type: 'error',
          message: 'This NFT is not claimable'
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking if NFT is claimable:', error);
      setStatus({
        type: 'error',
        message: 'Error checking NFT status. Please try again.'
      });
      return false;
    }
  };

  const claimNFT = async (e) => {
    e.preventDefault();
    
    if (!active) {
      setStatus({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      // Check if the NFT is claimable
      const isClaimable = await checkIfNFTIsClaimable();
      if (!isClaimable) {
        setLoading(false);
        return;
      }
      
      // Attempt to claim the NFT
      const tx = await nftContract.claimNFT(tokenId, secret);
      
      setStatus({
        type: 'info',
        message: 'Transaction submitted. Please wait for confirmation...'
      });
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      setStatus({
        type: 'success',
        message: `NFT #${tokenId} has been successfully claimed to your wallet!`
      });
      
      // Reset form
      setTokenId('');
      setSecret('');
    } catch (error) {
      console.error('Error claiming NFT:', error);
      
      let errorMessage = 'Failed to claim NFT. Please try again.';
      
      // Handle specific error messages from the contract
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message && error.message.includes('Invalid secret')) {
        errorMessage = 'The secret code you entered is incorrect.';
      } else if (error.message && error.message.includes('NFT is not claimable')) {
        errorMessage = 'This NFT is not available for claiming.';
      } else if (error.message && error.message.includes('NFT is not in default wallet')) {
        errorMessage = 'This NFT has already been claimed.';
      }
      
      setStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  if (!active) {
    return (
      <ClaimContainer>
        <SectionTitle>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z" fill="currentColor"/>
            <path d="M14.5 11h-3V8.5a.5.5 0 00-1 0V11h-3a.5.5 0 000 1h3v3.5a.5.5 0 001 0V12h3a.5.5 0 000-1z" fill="currentColor"/>
          </svg>
          Claim Your NFT
        </SectionTitle>
        <StatusMessage className="info">
          Please connect your wallet to claim an NFT
        </StatusMessage>
      </ClaimContainer>
    );
  }

  return (
    <ClaimContainer>
      <SectionTitle>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z" fill="currentColor"/>
          <path d="M14.5 11h-3V8.5a.5.5 0 00-1 0V11h-3a.5.5 0 000 1h3v3.5a.5.5 0 001 0V12h3a.5.5 0 000-1z" fill="currentColor"/>
        </svg>
        Claim Your NFT
      </SectionTitle>
      
      <ClaimForm onSubmit={claimNFT}>
        <FormGroup>
          <Label htmlFor="tokenId">Token ID</Label>
          <Input 
            id="tokenId"
            type="text"
            value={tokenId}
            onChange={handleTokenIdChange}
            placeholder="Enter NFT Token ID"
            disabled={loading}
          />
          <HelperText>Enter the Token ID of the NFT you want to claim</HelperText>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="secret">Secret Code</Label>
          <Input 
            id="secret"
            type="text"
            value={secret}
            onChange={handleSecretChange}
            placeholder="Enter the secret code"
            disabled={loading}
            autoComplete="off"
          />
          <HelperText>Enter the secret code provided to you to claim this NFT</HelperText>
        </FormGroup>
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Claim NFT'}
        </Button>
        
        {status.message && (
          <StatusMessage className={status.type}>
            {status.message}
          </StatusMessage>
        )}
      </ClaimForm>
    </ClaimContainer>
  );
};

export default ClaimNFT;