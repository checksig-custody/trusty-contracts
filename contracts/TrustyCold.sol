// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Trusty Cold Multisignature
 * @author Ramzi Bougammoura
 * @notice This contract is inherithed by Trusty Factory deployer
 * @dev All function calls are meant to be called from the Factory, but the contract can also be deployed alone
 * Copyright (c) 2024 Ramzi Bougammoura
 */
contract TrustyCold is ReentrancyGuard {
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

    error TimeLock(string err, int blockLeft);

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
        uint timeLock;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    // Absolute_timelock
    uint private blocklock;

    // Recovery
    address public recoveryTrusty;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier onlyRecover() {
        require(msg.sender == recoveryTrusty, "Not allowed!");
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
        string memory _id,
        address _recoveryTrusty,
        uint _blocklock
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

        require(_recoveryTrusty != address(0), "invalid Recovery Trusty address");
        recoveryTrusty = _recoveryTrusty;

        blocklock = _blocklock;
    }

    /**
    * @notice Method used by recovery address in Recovery scenario
    */
    function recover() public onlyRecover {
        uint amount = address(this).balance;        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "recover failed");
    }

    /**
    * @notice Method used by recovery address in ERC20 Recovery scenario
    */
    function recoverERC20(address _token) public onlyRecover {
        (bytes memory _dataApprove,) = encodeRecover(_token);
        (,bytes memory _dataTransfer) = encodeRecover(_token);
        (bool approveSuccess, ) = _token.call{value: 0}(_dataApprove);
        require(approveSuccess, "recoverERC20 approve failed");
        (bool transferSuccess, ) = _token.call{value: 0}(_dataTransfer);
        require(transferSuccess, "recoverERC20 transfer failed");
    }

    /**
    * @notice Method used to encode an ERC20 calldata
    */
    function encodeRecover(address _token) private returns(bytes memory, bytes memory) {
        address _recover = recoveryTrusty;
        
        bytes memory balance = abi.encodeWithSignature("balanceOf(address)", address(this));
        (bool success, bytes memory _amount) = _token.call{value: 0}(balance);
        require(success, "Unable to get balance of Token");

        bytes memory approve = abi.encodeWithSignature(
            "approve(address,uint256)", 
            _recover, 
            uint256(bytes32(_amount))
        );
        bytes memory transfer = abi.encodeWithSignature(
            "transfer(address,uint256)", 
            _recover, uint256(bytes32(_amount))
        );
        return (approve,transfer);
    }

    /**
    * @notice This method is used to submit a tx proposal seen by others owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @param _timeLock Relative timelock set the number of blocks required to execute the transaction
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes calldata _data, uint _timeLock) public onlyOwner {
        require(block.number <= block.number + _timeLock, "timeLock must be greater than current block");
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                blockHeight: block.number,
                timestamp: block.timestamp,
                timeLock: _timeLock + blocklock
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    /**
    * @notice Method used to confirm the tx with index `_txIndex` if exists, not executed and not confirmed.
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
    * @notice Method used to revoke a confirmation of tx with index `_txIndex` if exists and not executed.
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

        if (transaction.blockHeight + transaction.timeLock > block.number) {
            int blk = int(transaction.blockHeight + transaction.timeLock - block.number);
            revert TimeLock({err: "timeLock preventing execution: ",blockLeft: blk});
        }

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");        

        transaction.timestamp = block.timestamp;
        
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
    * @custom:return Returns a tx structure as (to, value, data, executed, numConfirmations)
    */
    function getTransaction(uint _txIndex) 
        public 
        view 
        returns(
            address to, 
            uint value, 
            bytes memory data, 
            bool executed, 
            uint numConfirmations, 
            uint blockHeight, 
            uint timestamp
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
            transaction.timestamp
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
