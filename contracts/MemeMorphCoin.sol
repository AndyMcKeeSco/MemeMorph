// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MemeMorphCoin
 * @dev ERC20 token for the MemeMorph platform
 */
contract MemeMorphCoin is ERC20, Ownable {
    // Emission rate for minting new tokens (tokens per day)
    uint256 public emissionRate;
    
    // Last time tokens were minted
    uint256 public lastMintTime;
    
    // Addresses that can mint tokens (NFT marketplace, staking contract)
    mapping(address => bool) public minters;

    /**
     * @dev Constructor that initializes the token with name and symbol
     * @param initialSupply The initial supply of tokens to mint
     */
    constructor(uint256 initialSupply) ERC20("MemeMorphCoin", "MMC") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
        emissionRate = 1000 * (10 ** decimals()); // 1000 tokens per day
        lastMintTime = block.timestamp;
    }

    /**
     * @dev Add a new minter address
     * @param minter Address to grant minting privileges
     */
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
    }

    /**
     * @dev Remove a minter address
     * @param minter Address to revoke minting privileges
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
    }

    /**
     * @dev Mint new tokens according to emission schedule
     * Can only be called by owner
     */
    function mintScheduledTokens() external onlyOwner {
        uint256 timeElapsed = block.timestamp - lastMintTime;
        uint256 daysPassed = timeElapsed / 1 days;
        
        if (daysPassed > 0) {
            uint256 tokensToMint = daysPassed * emissionRate;
            _mint(msg.sender, tokensToMint);
            lastMintTime = block.timestamp;
        }
    }

    /**
     * @dev Mint tokens to a specific address
     * Can only be called by approved minters (e.g., NFT marketplace for fees)
     * @param to Address to receive tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(minters[msg.sender] || owner() == msg.sender, "Not authorized to mint");
        _mint(to, amount);
    }

    /**
     * @dev Update the emission rate
     * @param newEmissionRate New emission rate (tokens per day)
     */
    function setEmissionRate(uint256 newEmissionRate) external onlyOwner {
        emissionRate = newEmissionRate;
    }

    /**
     * @dev Burns tokens from sender
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}