// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

/**
 * @title Trusty Recovery Multisignature
 * @author Ramzi Bougammoura
 * @notice This contract is inherithed by Trusty Factory deployer
 * @dev All function calls are meant to be called from the Factory, but the contract can also be deployed alone
 * Copyright (c) 2024 Ramzi Bougammoura
 */
contract Recovery {
    string public id;

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

    error TimeLock(string err,int blockLeft);

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
        uint blockHeight;
        uint timestamp;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    // whitelist
    mapping(address => bool) public whitelistedToAddresses;
    address[] public whitelistedAddressesList;

    // blacklist
    mapping(address => bool) public blacklistedToAddresses;
    address[] public blacklistedAddressesList;

    modifier isWhitelisted(address toAddress) {
        require(whitelistedToAddresses[toAddress], "Address/Contract not in Trusty Whitelist!");
        _;
    }

    modifier notBlacklisted(address toAddress) {
        require(!blacklistedToAddresses[toAddress], "Address is blacklisted!");
        _;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
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
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    // Constructor
    constructor(
        address[] memory _owners, 
        uint _numConfirmationsRequired, 
        string memory _id
    ) {
        require(_owners.length > 0, "owners required");
        
        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "invalid number of required confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;

            // Owners Auto-whitelisting
            //whitelistedToAddresses[owner] = true;
            //whitelistedAddressesList.push(owner);

            owners.push(owner);
        }

        // Trusty Auto-Whitelist
        whitelistedToAddresses[address(this)] = true;
        whitelistedAddressesList.push(address(this));

        numConfirmationsRequired = _numConfirmationsRequired;

        id = _id;
    }

    /**
    * @notice This method is used to submit a transaction proposal that will be seen by the others multisignature's owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes calldata _data) public onlyOwner isWhitelisted(_to) notBlacklisted(_to) {
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                blockHeight: block.number,
                timestamp: block.timestamp
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    /**
    * @notice Method used to confirm the transaction with index `_txIndex` if it exists, is not executed yet and also not even confirmed from the signer.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function confirmTransaction(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) notConfirmed(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /**
    * @notice Method used to revoke the confirmation of transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function revokeConfirmation(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    /**
    * @notice Method used to execute the transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function executeTransaction(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(!blacklistedToAddresses[transaction.to], "Cannot execute, address/contract is blacklisted!");
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");

        transaction.executed = true;
        
        emit ExecuteTransaction(msg.sender, _txIndex);
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
    function getTransaction(uint _txIndex) public view returns(address to, uint value, bytes memory data, bool executed, uint numConfirmations, uint blockHeight) {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.blockHeight
        );
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
    function addAddressToWhitelist(address[] memory addresses) private {
        for (uint i = 0; i < addresses.length; i++) {
            require(!whitelistedToAddresses[addresses[i]], "Each address must be unique to be in whitelist");
            whitelistedToAddresses[addresses[i]] = true;
            whitelistedAddressesList.push(addresses[i]);
        }        
    }

    /**
    * @notice addAddressToRecoverWhitelist - This function adds the address of the sender to the whitelist
    * @custom:param `address[]` An array of addresses to be whitelisted
    * @custom:owner Can be called by owner
    */
    function addAddressToRecoveryWhitelist(address[] memory addresses) public onlyOwner {        
        for (uint i = 0; i < addresses.length; i++) {
            // Add the address which called the function to the whitelistedAddress array
            whitelistedToAddresses[addresses[i]] = true;
            whitelistedAddressesList.push(addresses[i]);
        }        
    }

    /**
    * @notice This method is used by the Trusty's owner to get the blacklisted addresses
    * @custom:owner Can be called by owner
    */
    function getBlacklist() public view onlyOwner returns(address[] memory) {
        return blacklistedAddressesList;
    }

    /**
    * @notice addAddressToBlacklist - This function adds the address to the blacklist
    * @custom:param `address[]` An array of addresses to be removed from blacklist
    * @custom:owner Can be called by owner
    */
    function addAddressToBlacklist(address[] memory addresses) public onlyOwner {
        for (uint i = 0; i < addresses.length; i++) {
            require(!blacklistedToAddresses[addresses[i]], "Duplicate address in blacklist");
            blacklistedToAddresses[addresses[i]] = true;
            blacklistedAddressesList.push(addresses[i]);
        }        
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is empty
    */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is not empty
    */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
    * @notice Utility function to decode and check erc20 serialized calldata
    
    function checkData(bytes calldata encodedData) external view returns (bool) {
        uint len = encodedData.length;

        bool decoded = false;
        if (len >= 4 && len % 2 == 0) {
            bytes memory selector = bytes(abi.encode(bytes(encodedData[0:4])));
            bytes memory transfer = bytes(abi.encode(bytes(hex"a9059cbb")));
            bytes memory approve = bytes(abi.encode(bytes(hex"095ea7b3")));
            bytes memory transferFrom = bytes(abi.encode(bytes(hex"23b872dd")));
            bytes memory mint = bytes(abi.encode(bytes(hex"40c10f19")));
            if (
                keccak256(transfer) == keccak256(selector) || 
                keccak256(approve) == keccak256(selector) ||
                keccak256(transferFrom) == keccak256(selector) ||
                keccak256(mint) == keccak256(selector)
            ) {
                bool passed = bool(
                    keccak256(transfer) == keccak256(selector) || 
                    keccak256(approve) == keccak256(selector) || 
                    keccak256(transferFrom) == keccak256(selector) ||
                    keccak256(mint) == keccak256(selector)
                );
                
                if (passed) {
                    address payable to = abi.decode(encodedData[4:],(address));
                    require(whitelistedToAddresses[to], "Calldata not allowed or address not whitelisted!");
                    require(!blacklistedToAddresses[to], "Address in calldata is blacklisted!");
                    decoded = true;
                }
            }
        }
        return decoded;
    }
    */
}
