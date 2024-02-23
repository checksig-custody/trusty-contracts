// SPDX-License-Identifier: MIT

/**
 * 0xRMS TRUSTY FACTORY v0.1
 * Copyright (c) 2024 Ramzi Bougammoura
 */

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Trusty.sol";

//import "hardhat/console.sol";

/**
 * @title Trusty Multisignature Factory
 * @author Ramzi Bougammoura
 * @notice This contract helps to deploy, manage and interact with Trusty's multisignature
 */

contract TrustyFactory is Ownable {

    // Trusty indexed array
    Trusty[] public contracts;

    uint256 public totalTrusty = 0;

    //  _price of one Trusty
    uint256 public _price = 0.05 ether;
    bool public _priceEnabled = false;

    // whitelist
    mapping(address => bool) public whitelistedAddresses;
    uint8 public maxWhitelistedAddresses = 100;
    uint8 public numAddressesWhitelisted = 0;

    // Map owners address array to Trusty index
    mapping(uint256 => address[]) public trustyOwner;

    modifier notWhitelisted {
        require(whitelistedAddresses[msg.sender] || whitelistedAddresses[tx.origin], "Not in the whitelist!");
        _;
    }

    /**
     * CONSTRUCTOR
     */
    constructor() {
        whitelistedAddresses[msg.sender] = true;
        numAddressesWhitelisted++;
    }

    /**
    * @notice This method is used to create a Trusty multisignature
    * @param _owners Array of owners' addresses
    * @param _nTX Minimum number of confirmations required to execute a transaction
    */
    function createContract(address[] memory _owners, uint _nTX) payable public notWhitelisted {
        if(_priceEnabled) {
            require(msg.value >= _price, "Ether sent is not enough");
        }

        Trusty trusty = new Trusty(_owners, _nTX);
        contracts.push(trusty);

        whitelistedAddresses[address(trusty)] = true;
        numAddressesWhitelisted++;

        for (uint i = 0; i < _owners.length; i++) {
            whitelistedAddresses[_owners[i]] = true;
            numAddressesWhitelisted++;
        }

        trustyOwner[totalTrusty] = _owners;

        totalTrusty++;
    }

    /**
    * @notice This method is used to make a deposit on a Trusty multisignature
    * @param _contractIndex The Trusty contract index that will be funded
    * @param _amount Amount of ether to send
    */
    function depositContract(uint256 _contractIndex, uint _amount) public payable {
        (bool success, ) = payable(contracts[_contractIndex]).call{value: _amount}("");
        require(success, "failed deposit to trusty"); // revert forced
    }

    /**
    * @notice This method is used to retrieve the owners of the Trusty multisignature index specified
    * @param _contractIndex The Trusty contract index that will be called
    * @return address[] Returns the Trusty's owners' addresses array
    */
    function contractReadOwners(uint256 _contractIndex) public view returns(address[] memory) {
        //Trusty trusty = Trusty(Trusty[_contractIndex]);
        return contracts[_contractIndex].getOwners();
    }

    /**
    * @notice This method is used to retrieve the balance of the Trusty multisignature index specified
    * @param _contractIndex The Trusty contract index that will be called
    * @return uint256 Returns the Trusty's balance
    */
    function contractReadBalance(uint256 _contractIndex) public view returns(uint256) {
        //Trusty trusty = Trusty(Trusty[_contractIndex]);
        return contracts[_contractIndex].getBalance();
    }

    /**
    * @notice This method is used to retrieve the total amount of transactions of Trusty's index specified
    * @param _contractIndex The Trusty contract index that will be called
    * @return total Returns the total amount of created transactions of a Trusty as `uint`
    */
    function contractReadTxs(uint256 _contractIndex) public view returns(uint total) {
        uint txTotal = contracts[_contractIndex].getTransactionCount();

        return txTotal;
    }

    /**
    * @notice This method is used to check if the caller of Trusty's index specified is one of the owners
    * @param _contractIndex The Trusty contract index that will be called
    * @return bool Returns `true` if the caller is owner of the Trusty index specified
    */
    function imOwner(uint256 _contractIndex) public view returns(bool) {
        return contracts[_contractIndex].isOwner(tx.origin);
    }

    /**
    * @notice This method is used to retrieve the transaction data structure specified by its contract and transaction index
    * @param _contractIndex The Trusty contract index that will be called
    * @param _txIndex The transaction index of the contract's index specified
    * @custom:return bool Returns a Transaction structure as (address to, uint value, bytes data, bool executed, uint numConfirmations)
    */
    function getTx(uint256 _contractIndex, uint _txIndex) public view returns(address, uint, bytes memory, bool, uint, uint, uint) {
        return contracts[_contractIndex].getTransaction(_txIndex);
    }
    
    /**
    * @notice This method is used to submit a proposal of a transaction whose details are specified by method's parameters
    * @param _contractIndex The Trusty contract index that will be used to submit the transaction proposal
    * @param _to The receiver address of the proposed transaction or the contract's address to interact with
    * @param _value The amount value of the proposed transaction
    * @param _data The data parameter can contains ordinary data or an encoded call to interact with another contract
    */
    function trustySubmit(uint256 _contractIndex, address _to, uint256 _value, bytes memory _data, uint _timeLock) public notWhitelisted {
        contracts[_contractIndex].submitTransaction(_to, _value, _data, _timeLock);
    }
    
    /**
    * @notice This method is used to sign and confirm a transaction proposal by one of his owners
    * @param _contractIndex The Trusty contract index that will be called
    * @param _txIndex The transaction index of the contract's index specified
    */
    function trustyConfirm(uint256 _contractIndex, uint _txIndex) public notWhitelisted {
        contracts[_contractIndex].confirmTransaction(_txIndex);
    }

    /**
    * @notice This method is used to execute a transaction by one of his owners if requirements are met
    * @param _contractIndex The Trusty contract index that will be called
    * @param _txIndex The transaction index of the contract's index specified
    */
    function trustyExecute(uint256 _contractIndex, uint _txIndex) public notWhitelisted {
        contracts[_contractIndex].executeTransaction(_txIndex);
    }

    /**
    * @notice This method is used to revoke a transaction proposal if previously signed and confirmed by the caller
    * @param _contractIndex The Trusty contract index that will be called
    * @param _txIndex The transaction index of the contract's index specified
    */
    function trustyRevoke(uint256 _contractIndex, uint _txIndex) public notWhitelisted {
        contracts[_contractIndex].revokeConfirmation(_txIndex);
    }
    
    /**
    * @notice This method is used by the Trusty Factory's owner to set a price for the creation of a Trusty
    * @param price The new price that will override the previous one
    * @return uint256 Returns the new price configured
    */
    function trustyPriceConfig(uint256 price) public onlyOwner returns(uint256) {
        uint256 newPrice = price;
        _price = newPrice;
        return _price;
    }

    /**
    * @notice This method is used by the Trusty Factory's owner to toggle price activation
    * @return bool Returns true or false
    */
    function trustyPriceEnable() public onlyOwner returns(bool) {
        _priceEnabled = !_priceEnabled;
        return _priceEnabled;
    }

    /**
    * @notice This method is used by the Trusty's owner to get the whitelisted addresses
    * @custom:owner Can be called by owner
    */
    function getTrustyWhitelist(uint256 _contractIndex) public view returns(address[] memory) {
        return contracts[_contractIndex].getWhitelist();
    }

    /**
    * @notice This method is used by the Trusty's owner to update the whitelisted addresses
    * @custom:owner Can be called by owner
    */
    function addToTrustyWhitelist(uint256 _contractIndex, address[] memory addresses) public notWhitelisted {
        return contracts[_contractIndex].addAddressToWhitelist(addresses);
    }

    /**
    * @notice This method is used by the Trusty's owner to update the whitelisted addresses
    * @custom:owner Can be called by owner
    */
    function removeFromTrustyWhitelist(uint256 _contractIndex, address[] memory addresses) public notWhitelisted {
        return contracts[_contractIndex].removeAddressFromWhitelist(addresses);
    }

    /**
    * @notice This method is used to be whitelisted by Factory to the services
    * @custom:payable Require `_price`
    */
    function whitelistMe() public payable {
        // check if the numAddressesWhitelisted < maxWhitelistedAddresses, if not then throw an error.
        require(numAddressesWhitelisted < maxWhitelistedAddresses, "Whitelist limit reached");

        if(_priceEnabled) {
            require(msg.value >= _price, "Ether sent is not enough");
        }
        // Add the address which called the function to the whitelistedAddress array
        whitelistedAddresses[msg.sender] = true;
        
        // Increase the number of whitelisted addresses
        numAddressesWhitelisted += 1;
        //return contracts[_contractIndex].removeAddressFromWhitelist(addresses);
    }

    /**
    * @notice This method is used by the Trusty Factory's owner to set a maximum number of whitelisted addresses
    * @custom:owner Can be called by owner
    */
    function setMaxWhitelist(uint8 _maxWhitelistedAddresses) public onlyOwner {
        maxWhitelistedAddresses =  _maxWhitelistedAddresses;
    }

    /**
    * @notice addToFactoryWhitelist - This function adds the address to the Factory Whitelist
    * @custom:param `address[]` An array of addresses to be whitelisted
    * @custom:owner Can be called by owner
    */
    function addToFactoryWhitelist(address[] memory addresses) public onlyOwner {
        // check if the numAddressesWhitelisted < maxWhitelistedAddresses, if not then throw an error.
        require(numAddressesWhitelisted < maxWhitelistedAddresses, "Whitelist limit reached");
        
        for (uint i = 0; i < addresses.length; i++) {
            // Add the address which called the function to the whitelistedAddress array
            whitelistedAddresses[addresses[i]] = true;
            
            // Increase the number of whitelisted addresses
            numAddressesWhitelisted += 1;
        }        
    }

    /**
    * @notice removeFromFactoryWhitelist - This function removes the address from the Factory Whitelist
    * @custom:param `address[]` An array of addresses to be removed from whitelist
    * @custom:owner Can be called by owner
    */
    function removeFromFactoryWhitelist(address[] memory addresses) public onlyOwner {
        
        for (uint i = 0; i < addresses.length; i++) {
            // Add the address which called the function to the whitelistedAddress array
            whitelistedAddresses[addresses[i]] = false;
            
            // Increase the number of whitelisted addresses
            numAddressesWhitelisted -= 1;
        }        
    }

    /**
    * @notice This method is used by the Trusty Factory's owner to withdraw any amount deposited in the Factory
    * @dev withdraw and sends all the ethers in the contract
    */
    function withdraw() public onlyOwner {
        address _owner = owner();
        uint256 amount = address(this).balance;
        (bool sent, ) =  _owner.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    /**
    * @notice Function to receive Ether. msg.data must be empty
    */
    receive() external payable {}

    /**
    * @notice Fallback function is called when msg.data is not empty
    */
    fallback() external payable {}
}
