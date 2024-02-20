// SPDX-License-Identifier: MIT

/**
 * 0xRMS TRUSTY v0.1
 * Copyright (c) 2024 Ramzi Bougammoura
 */

pragma solidity ^0.8.24;

//import "hardhat/console.sol";

/**
 * @title Trusty Multisignature
 * @author Ramzi Bougammoura
 * @notice This contract is inherithed by Trusty Factory deployer
 * @dev All function calls are meant to be called from the Factory, but the contract can also be deployed alone
 */
contract Trusty {
    //Events
    event Deposit(address indexed sender, uint amount, uint balance);
    event SubmitTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);

    // Variable Slots
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;        
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    // whitelist
    mapping(address => bool) public whitelistedToAddresses;
    address[] public whitelistedAddressesList;
    
    uint8 public maxWhitelistedAddresses = 10;
    uint8 public numAddressesWhitelisted = 0;

    modifier notWhitelisted(address toAddress) {
        //require(whitelistedToAddresses[toAddress]);
        require(whitelistedToAddresses[toAddress], "Address not in whitelist!");
        _;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender] || isOwner[tx.origin], "not owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][tx.origin], "tx already confirmed");
        _;
    }

    // Constructor
    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "owners required");
        require(
            _numConfirmationsRequired > 1 &&
                _numConfirmationsRequired <= _owners.length,
            "invalid number of required confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;

            //whitelistedToAddresses[owner] = true;
            //whitelistedAddressesList.push(owner);

            numAddressesWhitelisted++;

            owners.push(owner);
        }

        whitelistedToAddresses[address(this)] = true;
        whitelistedAddressesList.push(address(this));

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    /**
    * @notice This method is used to submit a transaction proposal that will be seen by the others multisignature's owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes memory _data) public onlyOwner notWhitelisted(_to) {
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(tx.origin, txIndex, _to, _value, _data);
    }

    /**
    * @notice Method used to confirm the transaction with index `_txIndex` if it exists, is not executed yet and also not even confirmed from the signer.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function confirmTransaction(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) notConfirmed(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][tx.origin] = true;

        emit ConfirmTransaction(tx.origin, _txIndex);
    }

    /**
    * @notice Method used to execute the transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function executeTransaction(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        (bool success, ) = transaction.to.call{value: transaction.value}(
            //return abi.encodeWithSignature("callMe(uint256)", 123);
            //return abi.encodeWithSignature(transaction.data);
            transaction.data
        );
        require(success, "tx failed");

        transaction.executed = true;
        
        emit ExecuteTransaction(tx.origin, _txIndex);
    }

    /**
    * @notice Method used to revoke the confirmation of transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function revokeConfirmation(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][tx.origin], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][tx.origin] = false;

        emit RevokeConfirmation(tx.origin, _txIndex);
    }

    /**
    * @notice Method used to execute the transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @return address[] Returns the Trusty's owners as an array
    */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    /**
    * @notice Method used to get the current Trusty's balance
    * @return uint256 Returns the Trusty's balance as uint256
    */
    function getBalance() public view returns (uint256) {
        uint256 amount = address(this).balance;
        return amount;
    }

    /**
    * @notice Method used to get the current Trusty's total transactions
    * @return uint Returns the Trusty's total transactions as uint
    */
    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }

    /**
    * @notice Method used to get the transaction proposal structure
    * @param _txIndex The index of the transaction that needs to be retrieved
    * @custom:return Returns a Transaction structure as (address to, uint value, bytes data, bool executed, uint numConfirmations)
    */
    function getTransaction(uint _txIndex) public view returns(address to, uint value, bytes memory data, bool executed, uint numConfirmations) {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }

    /**
    * @notice This method is used by the Trusty's owner to set a maximum number of whitelisted addresses
    * @custom:owner Can be called by owner
    */
    function setMaxWhitelist(uint8 _maxWhitelistedAddresses) public onlyOwner {
        maxWhitelistedAddresses =  _maxWhitelistedAddresses;
    }

    /**
    * @notice This method is used by the Trusty's owner to get the whitelisted addresses
    * @custom:owner Can be called by owner
    */
    function getWhitelist() public view onlyOwner returns(address[] memory) {
        return whitelistedAddressesList;
    }

    /**
    * @notice addAddressToWhitelist - This function adds the address of the sender to the whitelist
    * @custom:param `address[]` An array of addresses to be whitelisted
    * @custom:owner Can be called by owner
    */
    function addAddressToWhitelist(address[] memory addresses) public onlyOwner {
        // check if the numAddressesWhitelisted < maxWhitelistedAddresses, if not then throw an error.
        require(numAddressesWhitelisted < maxWhitelistedAddresses, "Whitelist limit reached");
        
        for (uint i = 0; i < addresses.length; i++) {
            // Add the address which called the function to the whitelistedAddress array
            whitelistedToAddresses[addresses[i]] = true;
            whitelistedAddressesList.push(addresses[i]);
            
            // Increase the number of whitelisted addresses
            numAddressesWhitelisted += 1;
        }        
    }

    /**
    * @notice removeAddressFromWhitelist - This function removes the address of the sender to the whitelist
    * @custom:param `address[]` An array of addresses to be removed from whitelist
    * @custom:owner Can be called by owner
    */
    function removeAddressFromWhitelist(address[] memory addresses) public onlyOwner {        
        for (uint i = 0; i < addresses.length; i++) {
            // Add the address which called the function to the whitelistedAddress array
            whitelistedToAddresses[addresses[i]] = false;

            for (uint j = 0; j < whitelistedAddressesList.length; j++) {
                if (whitelistedAddressesList[j] == addresses[i]) {
                    delete whitelistedAddressesList[j];
                }
            }
            // Decrease the number of whitelisted addresses
            numAddressesWhitelisted -= 1;
        }        
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is empty
    */
    receive() external payable {
        emit Deposit(tx.origin, msg.value, address(this).balance);
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is not empty
    */
    fallback() external payable {
        emit Deposit(tx.origin, msg.value, address(this).balance);
    }

    /**
    * @notice Method used by the owners to destroy the contract making it unusuable and withdrawing all the funds
    */
   /*
    function destroy() public onlyOwner {
        //selfdestruct(payable(address)) > address.send(this.balance);
        address _address = tx.origin;
        selfdestruct(payable(_address));
    }
    */
}
