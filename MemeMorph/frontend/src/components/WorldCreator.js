import React, { useState } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';

const Container = styled.div`
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
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
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  height: 150px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
  }
`;

const Select = styled.select`
  padding: 12px;
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
  padding: 14px;
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

const CharactersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
`;

const CharacterCard = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  }
`;

const CharacterImage = styled.div`
  height: 200px;
  background-color: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CharacterInfo = styled.div`
  padding: 15px;
`;

const CharacterName = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 5px;
  color: var(--dark-color);
`;

const CharacterRole = styled.p`
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 10px;
`;

const CharacterTraits = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
`;

const Trait = styled.span`
  background-color: var(--light-color);
  color: var(--dark-color);
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 4px;
`;

const CharacterActions = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
`;

const ActionButton = styled.button`
  background-color: ${props => props.secondary ? '#6c757d' : 'var(--primary-color)'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.secondary ? '#5a6268' : 'var(--secondary-color)'};
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ClaimInfoModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 25px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.h3`
  font-size: 1.3rem;
  margin-bottom: 15px;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

const ClaimCode = styled.div`
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  margin: 15px 0;
  text-align: center;
  font-size: 1.2rem;
  letter-spacing: 1px;
`;

const WorldCreator = ({ contracts }) => {
  const { active, account } = useWeb3React();
  const [formData, setFormData] = useState({
    worldName: '',
    worldDescription: '',
    characterCount: 1,
    artStyle: 'fantasy',
  });
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [claimData, setClaimData] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For character count, ensure it's within bounds
    if (name === 'characterCount') {
      const count = parseInt(value);
      if (count < 1) return;
      if (count > 5) return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    if (!formData.worldDescription.trim()) {
      setStatus({
        type: 'error',
        message: 'Please enter a world description'
      });
      return false;
    }
    
    return true;
  };
  
  const generateCharacters = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      // First, save the world description to the lore database
      const worldId = formData.worldName.toLowerCase().replace(/\s+/g, '-') || 
                     `world-${Math.floor(Math.random() * 10000)}`;
      
      // Save the main world context
      await fetch('/api/world/lore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.worldName || `Unnamed World ${worldId}`,
          content: formData.worldDescription,
          category: 'world_context',
          world_id: worldId
        })
      });
      
      // Generate characters with world_id reference
      const response = await fetch('/api/world/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          world_description: formData.worldDescription,
          character_count: parseInt(formData.characterCount),
          style: formData.artStyle,
          world_id: worldId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate characters');
      }
      
      // Also save each character to the lore database
      for (const character of data.characters) {
        await fetch('/api/world/lore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: character.name,
            content: `**Role:** ${character.role}\n\n${character.description}\n\n**Traits:** ${character.traits.join(', ')}`,
            category: 'characters',
            world_id: worldId,
            metadata: {
              character_id: character.id,
              image_url: character.image_url
            }
          })
        });
      }
      
      setCharacters(data.characters);
      setStatus({
        type: 'success',
        message: `Generated ${data.characters.length} character(s) successfully for world "${worldId}"!`
      });
    } catch (error) {
      console.error('Error generating characters:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to generate characters. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const mintCharacterNFT = async (character) => {
    if (!active) {
      setStatus({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }
    
    setSelectedCharacter(character);
    setStatus({ type: 'info', message: 'Preparing to mint character NFT...' });
    
    try {
      // Get metadata for the character
      const metadataResponse = await fetch(`/api/world/character/mint/${character.id}`, {
        method: 'POST'
      });
      
      const metadataData = await metadataResponse.json();
      
      if (!metadataResponse.ok) {
        throw new Error(metadataData.error || 'Failed to prepare character metadata');
      }
      
      // Check if user has given approval to the contract for MMC tokens
      const tokenContract = contracts.tokenContract;
      if (tokenContract && tokenContract.address) {
        // Get the mint fee from the NFT contract
        const mintFee = await contracts.nftContract.mintFee();
        
        // Check if the user has enough tokens
        const balance = await tokenContract.balanceOf(account);
        
        if (balance.lt(mintFee)) {
          setStatus({
            type: 'error',
            message: `Insufficient MemeMorphCoin balance. You need ${mintFee.toString()} MMC tokens to mint an NFT.`
          });
          return;
        }
        
        // Check if the contract is already approved to spend tokens
        const allowance = await tokenContract.allowance(account, contracts.nftContract.address);
        
        if (allowance.lt(mintFee)) {
          setStatus({
            type: 'info',
            message: 'Approving tokens for minting...'
          });
          
          // Approve tokens for spending by the NFT contract
          const approveTx = await tokenContract.approve(
            contracts.nftContract.address, 
            ethers.constants.MaxUint256 // Infinite approval
          );
          
          setStatus({
            type: 'info',
            message: 'Approval transaction submitted. Please wait for confirmation...'
          });
          
          await approveTx.wait();
        }
      }
      
      // Create token URI for metadata
      const metadataStr = JSON.stringify(metadataData.metadata);
      const metadataUri = `data:application/json;base64,${btoa(metadataStr)}`;
      
      // Mint the NFT
      setStatus({
        type: 'info',
        message: 'Minting your character NFT. This may take a moment...'
      });
      
      const tx = await contracts.nftContract.mintNFT(metadataUri);
      
      setStatus({
        type: 'info',
        message: 'Transaction submitted. Please wait for confirmation...'
      });
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Find the NFTMinted event to get the token ID
      const nftMintedEvent = receipt.events.find(event => event.event === 'NFTMinted');
      const tokenId = nftMintedEvent ? nftMintedEvent.args.tokenId.toString() : 'unknown';
      
      setStatus({
        type: 'success',
        message: `Character NFT #${tokenId} minted successfully! You can view it in your collection.`
      });
    } catch (error) {
      console.error('Error minting character NFT:', error);
      
      let errorMessage = 'Failed to mint character NFT. Please try again.';
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        if (error.message.includes('mint fee') || error.message.includes('transfer failed')) {
          errorMessage = 'Insufficient MemeMorphCoin balance for mint fee.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected in your wallet.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setStatus({
        type: 'error',
        message: errorMessage
      });
    }
  };
  
  const createClaimableNFT = async (character) => {
    if (!active) {
      setStatus({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }
    
    setSelectedCharacter(character);
    setStatus({ type: 'info', message: 'Preparing claimable character NFT...' });
    
    try {
      // Generate a claim secret
      const claimResponse = await fetch(`/api/world/character/claim/${character.id}`, {
        method: 'POST'
      });
      
      const claimInfo = await claimResponse.json();
      
      if (!claimResponse.ok) {
        throw new Error(claimInfo.error || 'Failed to generate claim secret');
      }
      
      // Get metadata for the character
      const metadataResponse = await fetch(`/api/world/character/mint/${character.id}`, {
        method: 'POST'
      });
      
      const metadataData = await metadataResponse.json();
      
      if (!metadataResponse.ok) {
        throw new Error(metadataData.error || 'Failed to prepare character metadata');
      }
      
      // Check if user has given approval to the contract for MMC tokens
      const tokenContract = contracts.tokenContract;
      if (tokenContract && tokenContract.address) {
        // Get the mint fee from the NFT contract
        const mintFee = await contracts.nftContract.mintFee();
        
        // Check if the user has enough tokens
        const balance = await tokenContract.balanceOf(account);
        
        if (balance.lt(mintFee)) {
          setStatus({
            type: 'error',
            message: `Insufficient MemeMorphCoin balance. You need ${mintFee.toString()} MMC tokens to mint an NFT.`
          });
          return;
        }
        
        // Check if the contract is already approved to spend tokens
        const allowance = await tokenContract.allowance(account, contracts.nftContract.address);
        
        if (allowance.lt(mintFee)) {
          setStatus({
            type: 'info',
            message: 'Approving tokens for minting...'
          });
          
          // Approve tokens for spending by the NFT contract
          const approveTx = await tokenContract.approve(
            contracts.nftContract.address, 
            ethers.constants.MaxUint256 // Infinite approval
          );
          
          setStatus({
            type: 'info',
            message: 'Approval transaction submitted. Please wait for confirmation...'
          });
          
          await approveTx.wait();
        }
      }
      
      // Create token URI for metadata
      const metadataStr = JSON.stringify(metadataData.metadata);
      const metadataUri = `data:application/json;base64,${btoa(metadataStr)}`;
      
      // Mint the claimable NFT with the secret hash
      setStatus({
        type: 'info',
        message: 'Creating claimable character NFT. This may take a moment...'
      });
      
      const tx = await contracts.nftContract.mintClaimableNFT(
        metadataUri,
        claimInfo.claim_hash
      );
      
      setStatus({
        type: 'info',
        message: 'Transaction submitted. Please wait for confirmation...'
      });
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Find the NFTMinted event to get the token ID
      const nftMintedEvent = receipt.events.find(event => event.event === 'NFTMinted');
      const tokenId = nftMintedEvent ? nftMintedEvent.args.tokenId.toString() : 'unknown';
      
      // Save claim data for display
      setClaimData({
        characterName: character.name,
        tokenId: tokenId,
        secret: claimInfo.claim_secret
      });
      
      // Show the claim modal
      setShowClaimModal(true);
      
      setStatus({
        type: 'success',
        message: `Claimable Character NFT #${tokenId} created successfully!`
      });
    } catch (error) {
      console.error('Error creating claimable NFT:', error);
      
      let errorMessage = 'Failed to create claimable NFT. Please try again.';
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        if (error.message.includes('mint fee') || error.message.includes('transfer failed')) {
          errorMessage = 'Insufficient MemeMorphCoin balance for mint fee.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected in your wallet.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setStatus({
        type: 'error',
        message: errorMessage
      });
    }
  };
  
  const closeClaimModal = () => {
    setShowClaimModal(false);
  };
  
  if (!active) {
    return (
      <Container>
        <SectionTitle>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z" fill="currentColor"/>
            <path d="M14.5 11h-3V8.5a.5.5 0 00-1 0V11h-3a.5.5 0 000 1h3v3.5a.5.5 0 001 0V12h3a.5.5 0 000-1z" fill="currentColor"/>
          </svg>
          World Character Creator
        </SectionTitle>
        <StatusMessage className="info">
          Please connect your wallet to create world characters
        </StatusMessage>
      </Container>
    );
  }
  
  return (
    <Container>
      <SectionTitle>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z" fill="currentColor"/>
          <path d="M14.5 11h-3V8.5a.5.5 0 00-1 0V11h-3a.5.5 0 000 1h3v3.5a.5.5 0 001 0V12h3a.5.5 0 000-1z" fill="currentColor"/>
        </svg>
        World Character Creator
      </SectionTitle>
      
      <Form onSubmit={generateCharacters}>
        <FormGroup>
          <Label htmlFor="worldName">World Name (Optional)</Label>
          <Input 
            id="worldName"
            name="worldName"
            type="text"
            value={formData.worldName}
            onChange={handleInputChange}
            placeholder="Enter a name for your fictional world"
            disabled={loading}
          />
          <HelperText>Give your fictional world a memorable name</HelperText>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="worldDescription">World Description</Label>
          <TextArea 
            id="worldDescription"
            name="worldDescription"
            value={formData.worldDescription}
            onChange={handleInputChange}
            placeholder="Describe your fictional world in detail..."
            disabled={loading}
          />
          <HelperText>
            Provide details about your world's setting, history, magic systems, technology, 
            social structures, and other unique elements. The more detailed your description, 
            the more unique your characters will be.
          </HelperText>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="characterCount">Number of Characters</Label>
          <Input 
            id="characterCount"
            name="characterCount"
            type="number"
            min="1" 
            max="5"
            value={formData.characterCount}
            onChange={handleInputChange}
            disabled={loading}
          />
          <HelperText>How many characters you want to generate (maximum 5)</HelperText>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="artStyle">Art Style</Label>
          <Select
            id="artStyle"
            name="artStyle"
            value={formData.artStyle}
            onChange={handleInputChange}
            disabled={loading}
          >
            <option value="fantasy">Fantasy</option>
            <option value="scifi">Science Fiction</option>
            <option value="cyberpunk">Cyberpunk</option>
            <option value="anime">Anime</option>
            <option value="realistic">Realistic</option>
            <option value="cartoon">Cartoon</option>
            <option value="pixel">Pixel Art</option>
          </Select>
          <HelperText>Choose the visual style for your character portraits</HelperText>
        </FormGroup>
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Generating Characters...' : 'Generate Characters'}
        </Button>
        
        {status.message && (
          <StatusMessage className={status.type}>
            {status.message}
          </StatusMessage>
        )}
      </Form>
      
      {characters.length > 0 && (
        <CharactersContainer>
          {characters.map((character, index) => (
            <CharacterCard key={index}>
              <CharacterImage>
                {character.image_url ? (
                  <img src={character.image_url} alt={character.name} />
                ) : (
                  <div>No Image</div>
                )}
              </CharacterImage>
              <CharacterInfo>
                <CharacterName>{character.name}</CharacterName>
                <CharacterRole>{character.role}</CharacterRole>
                <CharacterTraits>
                  {character.traits.map((trait, idx) => (
                    <Trait key={idx}>{trait}</Trait>
                  ))}
                </CharacterTraits>
                <CharacterActions>
                  <ActionButton 
                    onClick={() => mintCharacterNFT(character)}
                    disabled={loading}
                  >
                    Mint NFT
                  </ActionButton>
                  <ActionButton 
                    secondary
                    onClick={() => createClaimableNFT(character)}
                    disabled={loading}
                  >
                    Create Claimable
                  </ActionButton>
                </CharacterActions>
              </CharacterInfo>
            </CharacterCard>
          ))}
        </CharactersContainer>
      )}
      
      {showClaimModal && claimData && (
        <ClaimInfoModal>
          <ModalContent>
            <ModalTitle>Claimable NFT Created</ModalTitle>
            <p>
              You've created a claimable NFT for <strong>{claimData.characterName}</strong>. 
              Share the details below with someone who can claim this NFT.
            </p>
            <p><strong>Token ID:</strong> {claimData.tokenId}</p>
            <p><strong>Claim Secret:</strong></p>
            <ClaimCode>{claimData.secret}</ClaimCode>
            <p>
              <strong>Important:</strong> Store this information securely. 
              Anyone with this code can claim the NFT.
            </p>
            <ModalButtons>
              <ActionButton onClick={closeClaimModal}>Close</ActionButton>
            </ModalButtons>
          </ModalContent>
        </ClaimInfoModal>
      )}
    </Container>
  );
};

export default WorldCreator;