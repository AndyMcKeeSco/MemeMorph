// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./MemeMorphCoin.sol";

/**
 * @title MemeMorphNFT
 * @dev NFT contract for the MemeMorph platform that integrates with MemeMorphCoin
 */
contract MemeMorphNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Reference to the MemeMorphCoin contract
    MemeMorphCoin public memeMorphCoin;
    
    // Fee in MemeMorphCoin tokens required to mint an NFT
    uint256 public mintFee;
    
    // Fee in MemeMorphCoin tokens required for transactions
    uint256 public transactionFee;
    
    // Creator royalties percentage (in basis points, 100 = 1%)
    uint256 public royaltyPercentage;
    
    // Mapping of token ID to creator address
    mapping(uint256 => address) public creators;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);
    event NFTTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);

    /**
     * @dev Constructor initializes the NFT contract
     * @param coinAddress Address of the MemeMorphCoin contract
     * @param initialMintFee Initial fee for minting (in MMC tokens)
     * @param initialTransactionFee Initial fee for transactions (in MMC tokens)
     */
    constructor(
        address coinAddress,
        uint256 initialMintFee,
        uint256 initialTransactionFee
    ) ERC721("MemeMorphNFT", "MMNFT") Ownable(msg.sender) {
        memeMorphCoin = MemeMorphCoin(coinAddress);
        mintFee = initialMintFee;
        transactionFee = initialTransactionFee;
        royaltyPercentage = 250; // 2.5% default royalty
    }

    /**
     * @dev Mint a new NFT
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
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        // Mint the NFT
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        // Record the creator
        creators[newTokenId] = msg.sender;
        
        emit NFTMinted(newTokenId, msg.sender, tokenURI);
        
        return newTokenId;
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
     * @dev Withdraw accumulated MemeMorphCoin tokens to owner
     */
    function withdrawTokens() external onlyOwner {
        uint256 balance = memeMorphCoin.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        memeMorphCoin.transfer(owner(), balance);
    }
}