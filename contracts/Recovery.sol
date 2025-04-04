// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Trusty Recovery Multisignature
 * @author Ramzi Bougammoura
 * Copyright (c) 2024 Ramzi Bougammoura
 */
contract Recovery is ReentrancyGuard {
    string public id;

    // Events
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

    error TimeLock(string err, int blockLeft);

    // State variables
    address[] public owners;
    mapping(address is_owner => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;     
        uint blockHeight;
        uint timestamp;
        bool exists;
        uint index;
    }

    uint public txIndex = 0;

    // mapping tx index => owner => bool
    mapping(uint tx_index => mapping(address => bool)) public isConfirmed;

    // mapping uint => Transaction
    mapping(uint tx_index => Transaction) public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(transactions[_txIndex].exists, "tx does not exist");
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

            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;

        id = _id;
    }

    /**
    * @notice Method used to submit a transaction proposal seen by others owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes calldata _data) public onlyOwner {

        transactions[txIndex] =
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                blockHeight: block.number,
                timestamp: block.timestamp,
                exists: true,
                index: txIndex
            })
        ;

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);

        txIndex++;
    }

    /**
    * @notice Method used to confirm the transaction with index `_txIndex` if exists, is not executed and not confirmed.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function confirmTransaction(uint _txIndex) 
        public 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
        notConfirmed(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /**
    * @notice Method used to revoke a confirmation with index `_txIndex` if exists and not executed.
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
    function executeTransaction(uint _txIndex) 
        public 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
        nonReentrant() 
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");        
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }    

    /**
    * @notice Method used to execute the transaction with index `_txIndex` if exists and not executed.
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
        return txIndex;
    }

    /**
    * @notice Method used to get the transaction proposal structure
    * @param _txIndex The index of the transaction that needs to be retrieved
    * @custom:return Returns a tx structure as (to, value, data, executed, numConfirmations)
    */
    function getTransaction(uint _txIndex) public view 
        returns(
            address to, 
            uint value, 
            bytes memory data, 
            bool executed, 
            uint numConfirmations, 
            uint blockHeight,
            uint timestamp,
            bool exists,
            uint index
        ) 
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.blockHeight,
            transaction.timestamp,
            transaction.exists,
            transaction.index
        );
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
}
