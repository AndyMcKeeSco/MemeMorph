// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./MemeMorphCoin.sol";

/**
 * @title MemeMorphNFT
 * @dev NFT contract for the MemeMorph platform that integrates with MemeMorphCoin and allows claiming NFTs with a secret
 */
contract MemeMorphNFT is ERC721URIStorage, Ownable {
    using ECDSA for bytes32;
    
    // Token ID counter (replacing Counters.sol which is no longer available in latest OpenZeppelin)
    uint256 private _tokenIdCounter;
    
    // Reference to the MemeMorphCoin contract
    MemeMorphCoin public memeMorphCoin;
    
    // Fee in MemeMorphCoin tokens required to mint an NFT
    uint256 public mintFee;
    
    // Fee in MemeMorphCoin tokens required for transactions
    uint256 public transactionFee;
    
    // Creator royalties percentage (in basis points, 100 = 1%)
    uint256 public royaltyPercentage;
    
    // Default wallet address where unclaimed NFTs are held
    address public defaultWallet;
    
    // Mapping of token ID to creator address
    mapping(uint256 => address) public creators;
    
    // Mapping of token ID to claim status
    mapping(uint256 => bool) public claimable;
    
    // Mapping of token ID to claim secret hash
    mapping(uint256 => bytes32) public claimSecretHashes;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI, bool isClaimable);
    event NFTTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);
    event NFTClaimed(uint256 indexed tokenId, address indexed claimer);
    
    /**
     * @dev Constructor initializes the NFT contract
     * @param coinAddress Address of the MemeMorphCoin contract
     * @param initialMintFee Initial fee for minting (in MMC tokens)
     * @param initialTransactionFee Initial fee for transactions (in MMC tokens)
     * @param _defaultWallet Address of the default wallet to hold unclaimed NFTs
     */
    constructor(
        address coinAddress,
        uint256 initialMintFee,
        uint256 initialTransactionFee,
        address _defaultWallet
    ) ERC721("MemeMorphNFT", "MMNFT") Ownable(msg.sender) {
        require(_defaultWallet != address(0), "Default wallet cannot be zero address");
        
        memeMorphCoin = MemeMorphCoin(coinAddress);
        mintFee = initialMintFee;
        transactionFee = initialTransactionFee;
        royaltyPercentage = 250; // 2.5% default royalty
        defaultWallet = _defaultWallet;
    }

    /**
     * @dev Mint a new NFT directly to the caller
     * @param tokenURI The metadata URI for the NFT
     * @return The newly minted token ID
     */
    function mintNFT(string memory tokenURI) external returns (uint256) {
        // Collect mint fee in MemeMorphCoin
        require(
            memeMorphCoin.transferFrom(msg.sender, address(this), mintFee),
            "Mint fee transfer failed"
        );
        
        // Burn 50% of the mint fee
        memeMorphCoin.burn(mintFee / 2);
        
        // Increment token ID counter
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        // Mint the NFT to the caller
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        // Record the creator
        creators[newTokenId] = msg.sender;
        
        // This NFT is not claimable
        claimable[newTokenId] = false;
        
        emit NFTMinted(newTokenId, msg.sender, tokenURI, false);
        
        return newTokenId;
    }

    /**
     * @dev Mint a claimable NFT that will be held by the default wallet until claimed
     * @param tokenURI The metadata URI for the NFT
     * @param secretHash Hash of the secret that will be required to claim the NFT
     * @return The newly minted token ID
     */
    function mintClaimableNFT(string memory tokenURI, bytes32 secretHash) external returns (uint256) {
        // Collect mint fee in MemeMorphCoin
        require(
            memeMorphCoin.transferFrom(msg.sender, address(this), mintFee),
            "Mint fee transfer failed"
        );
        
        // Burn 50% of the mint fee
        memeMorphCoin.burn(mintFee / 2);
        
        // Increment token ID counter
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        // Mint the NFT to the default wallet
        _mint(defaultWallet, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        // Record the creator
        creators[newTokenId] = msg.sender;
        
        // Mark this NFT as claimable and store the secret hash
        claimable[newTokenId] = true;
        claimSecretHashes[newTokenId] = secretHash;
        
        emit NFTMinted(newTokenId, msg.sender, tokenURI, true);
        
        return newTokenId;
    }
    
    /**
     * @dev Claim an NFT using the secret
     * @param tokenId The token ID to claim
     * @param secret The secret to verify against the stored hash
     */
    function claimNFT(uint256 tokenId, string memory secret) external {
        require(claimable[tokenId], "NFT is not claimable");
        require(ownerOf(tokenId) == defaultWallet, "NFT is not in default wallet");
        
        // Verify the secret
        bytes32 secretHash = keccak256(abi.encodePacked(secret, tokenId));
        require(secretHash == claimSecretHashes[tokenId], "Invalid secret");
        
        // Transfer the NFT from the default wallet to the claimer
        _transfer(defaultWallet, msg.sender, tokenId);
        
        // Mark as no longer claimable
        claimable[tokenId] = false;
        
        emit NFTClaimed(tokenId, msg.sender);
    }
    
    /**
     * @dev Allows the contract owner to mark an NFT as no longer claimable
     * @param tokenId The token ID to update
     */
    function deactivateClaim(uint256 tokenId) external onlyOwner {
        require(claimable[tokenId], "NFT is not claimable");
        claimable[tokenId] = false;
    }

    /**
     * @dev Transfer an NFT with payment in MemeMorphCoin
     * @param to Recipient address
     * @param tokenId Token ID to transfer
     * @param price Price in MemeMorphCoin tokens
     */
    function transferWithPayment(address to, uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(to != address(0), "Invalid recipient");
        
        // Calculate fees
        uint256 royaltyAmount = (price * royaltyPercentage) / 10000;
        uint256 sellerAmount = price - royaltyAmount - transactionFee;
        
        // Collect payment from buyer
        require(
            memeMorphCoin.transferFrom(to, address(this), price),
            "Payment transfer failed"
        );
        
        // Pay royalties to creator
        address creator = creators[tokenId];
        if (creator != msg.sender && royaltyAmount > 0) {
            memeMorphCoin.transfer(creator, royaltyAmount);
        } else {
            // If seller is creator, they get the royalty too
            sellerAmount += royaltyAmount;
        }
        
        // Pay seller
        memeMorphCoin.transfer(msg.sender, sellerAmount);
        
        // Burn 50% of the transaction fee
        memeMorphCoin.burn(transactionFee / 2);
        
        // Transfer the NFT
        _transfer(msg.sender, to, tokenId);
        
        emit NFTTransferred(tokenId, msg.sender, to, price);
    }

    /**
     * @dev Update the mint fee
     * @param newMintFee New mint fee in MemeMorphCoin tokens
     */
    function setMintFee(uint256 newMintFee) external onlyOwner {
        mintFee = newMintFee;
    }

    /**
     * @dev Update the transaction fee
     * @param newTransactionFee New transaction fee in MemeMorphCoin tokens
     */
    function setTransactionFee(uint256 newTransactionFee) external onlyOwner {
        transactionFee = newTransactionFee;
    }

    /**
     * @dev Update the royalty percentage
     * @param newRoyaltyPercentage New royalty percentage in basis points
     */
    function setRoyaltyPercentage(uint256 newRoyaltyPercentage) external onlyOwner {
        require(newRoyaltyPercentage <= 1000, "Cannot exceed 10%");
        royaltyPercentage = newRoyaltyPercentage;
    }
    
    /**
     * @dev Update the default wallet for holding unclaimed NFTs
     * @param newDefaultWallet New default wallet address
     */
    function setDefaultWallet(address newDefaultWallet) external onlyOwner {
        require(newDefaultWallet != address(0), "Default wallet cannot be zero address");
        defaultWallet = newDefaultWallet;
    }

    /**
     * @dev Withdraw accumulated MemeMorphCoin tokens to owner
     */
    function withdrawTokens() external onlyOwner {
        uint256 balance = memeMorphCoin.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        memeMorphCoin.transfer(owner(), balance);
    }
}