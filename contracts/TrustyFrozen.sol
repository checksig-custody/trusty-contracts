// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

/**
 * @title Trusty Advanced Multisignature
 * @author Ramzi Bougammoura
 * @notice This contract is inherithed by Trusty Factory deployer
 * @dev All function calls are meant to be called from the Factory, but the contract can also be deployed alone
 * Copyright (c) 2024 Ramzi Bougammoura
 */
contract TrustyFrozen {
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
    event AuthorizeTransaction(address indexed authorizer, uint indexed txIndex);

    error TimeLock(string err,int blockLeft);

    // Variable Slots
    address[] public owners;
    mapping(address => bool) public isOwner;
    address[] public authorizers;
    mapping(address => bool) public isAuthorizer;
    uint public numConfirmationsRequired;
    uint public numAuthorizationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
        uint numAuthorizations;
        uint blockHeight;
        uint timestamp;
        uint timeLock;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;
    mapping(uint => mapping(address => bool)) public isAuthorized;

    Transaction[] public transactions;

    // Absolute_timelock
    uint offset = 120; // Blocks required against an eventual fork
    uint private blocklock;
    uint public absolute_timelock;

    // Recovery
    address public recoveryTrusty;

    modifier onlyRecover() {
        require(msg.sender == recoveryTrusty, "Not allowed!");
        _;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner"); //
        _;
    }

    modifier onlyAuthorizer() {
        require(isAuthorizer[msg.sender], "not an authorizer"); //
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

    modifier notAuthorized(uint _txIndex) {
        require(!isAuthorized[_txIndex][msg.sender], "tx already authorized");
        _;
    }

    modifier notUnlocked() {
        require(block.number >= absolute_timelock,"TrustyFrozen not yet unlocked!");
        _;
    }

    // Constructor
    constructor(
        address[] memory _owners, 
        uint _numConfirmationsRequired, 
        string memory _id, 
        address _recoveryTrusty,
        uint _blocklock,
        address[] memory _authorizers
    ) {
        require(_owners.length > 0, "owners required");
        require(_authorizers.length > 0, "authorizers required");
        
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
        
        for (uint i = 0; i < _authorizers.length; i++) {
            address authorizer = _authorizers[i];
            require(authorizer != address(0), "invalid authorizer");
            require(!isAuthorizer[authorizer], "authorizer not unique");

            isAuthorizer[authorizer] = true;

            authorizers.push(authorizer);
        }
        
        numConfirmationsRequired = _numConfirmationsRequired;
        numAuthorizationsRequired = 2;

        id = _id;

        require(_recoveryTrusty != address(0), "invalid Recovery Trusty address");
        recoveryTrusty = _recoveryTrusty;

        blocklock = _blocklock;

        unlock();
    }

    /**
    * @notice Method used to update and reset the absolute timelock. Triggered after Transaction execution
    */
    function unlock() private {
        absolute_timelock = block.number + offset + blocklock;
    }

    /**
    * @notice Method used by recovery address in Recovery scenario
    */
    function recover() public onlyRecover notUnlocked {
        uint amount = address(this).balance;        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "recover failed");
    }

    /**
    * @notice Method used by recovery address in ERC20 Recovery scenario
    */
    function recoverERC20(address _token) public onlyRecover notUnlocked {
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

        bytes memory approve = abi.encodeWithSignature("approve(address,uint256)", _recover, uint256(bytes32(_amount)));
        bytes memory transfer = abi.encodeWithSignature("transfer(address,uint256)", _recover, uint256(bytes32(_amount)));
        return (approve,transfer);
    }

    /**
    * @notice This method is used to submit a transaction proposal that will be seen by the others multisignature's owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @param _timeLock Relative timelock set the number of blocks required to execute the transaction
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes calldata _data, uint _timeLock) public onlyAuthorizer {
        require(block.number <= block.number + _timeLock, "timeLock must be greater than current blockHeight + timeLock");
        //this.checkData(_data);

        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                numAuthorizations: 0,
                blockHeight: block.number,
                timestamp: block.timestamp,
                timeLock: _timeLock
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
        require(!isAuthorizer[msg.sender] ,"Authorizer can not confirm");
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /**
     * @notice Method used to add an authorization to a transaction
     */
    function authorizeTransaction(uint _txIndex) public onlyAuthorizer txExists(_txIndex) notExecuted(_txIndex) notAuthorized(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numAuthorizations += 1;
        isAuthorized[_txIndex][msg.sender] = true;

        emit AuthorizeTransaction(msg.sender, _txIndex);
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
    function executeTransaction(uint _txIndex) public onlyAuthorizer txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        require(transaction.numAuthorizations >= numAuthorizationsRequired, "cannot execute tx due to number of authorization required");

        if (transaction.blockHeight + transaction.timeLock > block.number) {
            int blk = int(transaction.blockHeight + transaction.timeLock - block.number);
            revert TimeLock({err: "timeLock preventing execution: ",blockLeft: blk});
        }

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");

        transaction.executed = true;

        transaction.timestamp = block.timestamp;

        unlock();
        
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
    function getTransaction(uint _txIndex) public view returns(address to, uint value, bytes memory data, bool executed, uint numConfirmations, uint numAuthorizations, uint blockHeight, uint timestamp, uint timeLock) {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.numAuthorizations,
            transaction.blockHeight,
            transaction.timestamp,
            transaction.timeLock
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
