import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';

const CollectionContainer = styled.div`
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

const NFTGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const NFTCard = styled.div`
  background-color: var(--light-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
`;

const NFTImagePlaceholder = styled.div`
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
`;

const NFTInfo = styled.div`
  padding: 15px;
`;

const NFTName = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 5px;
  color: var(--dark-color);
`;

const NFTId = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
`;

const NFTMetadata = styled.div`
  font-size: 0.8rem;
  color: #888;
  margin-top: 10px;
  
  span {
    display: block;
    margin-top: 3px;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 20px;
  color: #666;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 20px;
  color: var(--danger-color);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #666;
  background-color: var(--light-color);
  border-radius: 8px;
  margin-top: 20px;
`;

const ActionButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--secondary-color);
  }
`;

const NFTCollection = ({ nftContract }) => {
  const { account, active, library } = useWeb3React();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!active || !account || !nftContract) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get the NFT balance (how many NFTs the user owns)
        const balance = await nftContract.balanceOf(account);
        const balanceNumber = balance.toNumber();
        
        if (balanceNumber === 0) {
          setNfts([]);
          setLoading(false);
          return;
        }
        
        // We need to find which NFTs the user owns
        // Unfortunately, ERC721 doesn't have a built-in way to enumerate tokens
        // So we'll look for NFT transfer events to this address
        
        // Get token IDs owned by the user
        const filter = nftContract.filters.Transfer(null, account, null);
        const events = await nftContract.queryFilter(filter);
        
        // Create a map to track only the current NFTs owned (in case some were transferred out)
        const ownedNFTs = {};
        
        // Add NFTs transferred to the user
        for (const event of events) {
          const tokenId = event.args.tokenId.toString();
          ownedNFTs[tokenId] = true;
        }
        
        // Remove NFTs transferred from the user to someone else
        const outFilter = nftContract.filters.Transfer(account, null, null);
        const outEvents = await nftContract.queryFilter(outFilter);
        
        for (const event of outEvents) {
          const tokenId = event.args.tokenId.toString();
          delete ownedNFTs[tokenId];
        }
        
        // Now fetch details for each NFT
        const tokenIds = Object.keys(ownedNFTs);
        const nftDetails = await Promise.all(
          tokenIds.map(async (tokenId) => {
            try {
              // Check if we still own this NFT
              const currentOwner = await nftContract.ownerOf(tokenId);
              if (currentOwner.toLowerCase() !== account.toLowerCase()) {
                return null; // We don't own this anymore
              }
              
              // Get token URI
              const tokenURI = await nftContract.tokenURI(tokenId);
              
              // Get creator
              const creator = await nftContract.creators(tokenId);
              
              return {
                id: tokenId,
                tokenURI,
                creator,
                isCreator: creator.toLowerCase() === account.toLowerCase()
              };
            } catch (err) {
              console.error(`Error fetching NFT ${tokenId}:`, err);
              return null;
            }
          })
        );
        
        // Filter out any null values (NFTs we couldn't fetch or don't own anymore)
        setNfts(nftDetails.filter(nft => nft !== null));
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to load your NFT collection. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTs();
  }, [active, account, nftContract, library]);

  const refreshCollection = () => {
    if (!active || !account || !nftContract) return;
    
    setLoading(true);
    setNfts([]);
    
    const fetchNFTs = async () => {
      try {
        setError(null);
        
        // Get the NFT balance (how many NFTs the user owns)
        const balance = await nftContract.balanceOf(account);
        const balanceNumber = balance.toNumber();
        
        if (balanceNumber === 0) {
          setNfts([]);
          setLoading(false);
          return;
        }
        
        // Get token IDs owned by the user
        const filter = nftContract.filters.Transfer(null, account, null);
        const events = await nftContract.queryFilter(filter);
        
        // Create a map to track only the current NFTs owned (in case some were transferred out)
        const ownedNFTs = {};
        
        // Add NFTs transferred to the user
        for (const event of events) {
          const tokenId = event.args.tokenId.toString();
          ownedNFTs[tokenId] = true;
        }
        
        // Remove NFTs transferred from the user to someone else
        const outFilter = nftContract.filters.Transfer(account, null, null);
        const outEvents = await nftContract.queryFilter(outFilter);
        
        for (const event of outEvents) {
          const tokenId = event.args.tokenId.toString();
          delete ownedNFTs[tokenId];
        }
        
        // Now fetch details for each NFT
        const tokenIds = Object.keys(ownedNFTs);
        const nftDetails = await Promise.all(
          tokenIds.map(async (tokenId) => {
            try {
              // Check if we still own this NFT
              const currentOwner = await nftContract.ownerOf(tokenId);
              if (currentOwner.toLowerCase() !== account.toLowerCase()) {
                return null; // We don't own this anymore
              }
              
              // Get token URI
              const tokenURI = await nftContract.tokenURI(tokenId);
              
              // Get creator
              const creator = await nftContract.creators(tokenId);
              
              return {
                id: tokenId,
                tokenURI,
                creator,
                isCreator: creator.toLowerCase() === account.toLowerCase()
              };
            } catch (err) {
              console.error(`Error fetching NFT ${tokenId}:`, err);
              return null;
            }
          })
        );
        
        // Filter out any null values (NFTs we couldn't fetch or don't own anymore)
        setNfts(nftDetails.filter(nft => nft !== null));
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to load your NFT collection. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchNFTs();
  };

  if (!active) {
    return (
      <CollectionContainer>
        <SectionTitle>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm16 0H5v14h14V5z" fill="currentColor"/>
            <path d="M11 7h2v10h-2V7z" fill="currentColor"/>
            <path d="M7 11h10v2H7v-2z" fill="currentColor"/>
          </svg>
          Your NFT Collection
        </SectionTitle>
        <EmptyState>
          Please connect your wallet to view your NFT collection.
        </EmptyState>
      </CollectionContainer>
    );
  }

  return (
    <CollectionContainer>
      <SectionTitle>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm16 0H5v14h14V5z" fill="currentColor"/>
          <path d="M11 7h2v10h-2V7z" fill="currentColor"/>
          <path d="M7 11h10v2H7v-2z" fill="currentColor"/>
        </svg>
        Your NFT Collection
        <ActionButton 
          style={{ marginLeft: 'auto', fontSize: '0.9rem' }} 
          onClick={refreshCollection}
        >
          Refresh
        </ActionButton>
      </SectionTitle>
      
      {loading ? (
        <LoadingState>Loading your NFT collection...</LoadingState>
      ) : error ? (
        <ErrorState>{error}</ErrorState>
      ) : nfts.length === 0 ? (
        <EmptyState>
          <div>You don't own any NFTs yet.</div>
          <ActionButton style={{ marginTop: '20px' }}>Create Your First NFT</ActionButton>
        </EmptyState>
      ) : (
        <NFTGrid>
          {nfts.map(nft => (
            <NFTCard key={nft.id}>
              <NFTImagePlaceholder>
                🖼️
              </NFTImagePlaceholder>
              <NFTInfo>
                <NFTName>MemeMorph #{nft.id}</NFTName>
                <NFTId>Token ID: {nft.id}</NFTId>
                <NFTMetadata>
                  <span>Creator: {nft.isCreator ? 'You' : `${nft.creator.substring(0, 6)}...${nft.creator.substring(nft.creator.length - 4)}`}</span>
                  <span>URI: {nft.tokenURI.substring(0, 20)}...</span>
                </NFTMetadata>
                <ActionButton>View Details</ActionButton>
              </NFTInfo>
            </NFTCard>
          ))}
        </NFTGrid>
      )}
    </CollectionContainer>
  );
};

export default NFTCollection;