// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

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
        uint timeLock;   
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

    // Absolute_timelock
    uint offset = 120; // Blocks required against an eventual fork
    uint private blocklock;
    uint public absolute_timelock;

    // Recovery
    address public recoveryTrusty;

    modifier notUnlocked() {
        require(block.number >= absolute_timelock,"Trusty not yet unlocked!");
        _;
    }

    modifier onlyRecover() {
        require(msg.sender == recoveryTrusty || tx.origin == recoveryTrusty, "Not allowed!");
        _;
    }

    modifier isWhitelisted(address toAddress) {
        require(whitelistedToAddresses[toAddress], "Address/Contract not in Trusty Whitelist!");
        _;
    }

    modifier notBlacklisted(address toAddress) {
        require(!blacklistedToAddresses[toAddress], "Address is blacklisted!");
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
    constructor(
        address[] memory _owners, 
        uint _numConfirmationsRequired, 
        string memory _id, 
        address[] memory whitelist, 
        address _recoveryTrusty,
        uint _blocklock
    ) {
        require(_owners.length > 0, "owners required");

        require(whitelist.length > 0, "a minimum whitelist is required or the funds will be locked forever");
        
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

        addAddressToWhitelist(whitelist);

        numConfirmationsRequired = _numConfirmationsRequired;

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
    * @notice Method used to update and reset the absolute timelock. Triggered after Transaction execution
    */
    function POR() external onlyRecover notUnlocked {
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
    function recoverERC20(address _token, uint256 _amount) public onlyRecover notUnlocked {        
        (bytes memory _dataApprove,) = encodeRecover(_amount);
        (,bytes memory _dataTransfer) = encodeRecover(_amount);
        (bool approveSuccess, ) = _token.call{value: 0}(_dataApprove);
        require(approveSuccess, "recoverERC20 approve failed");
        (bool transferSuccess, ) = _token.call{value: 0}(_dataTransfer);
        require(transferSuccess, "recoverERC20 transfer failed");
    }

    function encodeRecover(uint256 _amount) private view returns (bytes memory, bytes memory) {
        //bytes memory encoded = abi.encodeWithSignature("callMe(uint256)", 123);
        address _recover = recoveryTrusty;
        bytes memory approve = abi.encodeWithSignature("approve(address,uint256)", _recover, _amount);
        bytes memory transfer = abi.encodeWithSignature("transfer(address,uint256)", _recover, _amount);
        return (approve,transfer);
    }

    /**
    * @notice This method is used to submit a transaction proposal that will be seen by the others multisignature's owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes calldata _data, uint _timeLock) public onlyOwner isWhitelisted(_to) notBlacklisted(_to) {
        require(block.number <= block.number + _timeLock, "timeLock must be greater than current blockHeight + timeLock");
        this.checkData(_data);

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
                timeLock: _timeLock
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
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function executeTransaction(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(!blacklistedToAddresses[transaction.to], "Cannot execute, address/contract is blacklisted!");
        this.checkData(transaction.data);
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        if (transaction.blockHeight + transaction.timeLock > block.number) {
            int blk = int(transaction.blockHeight + transaction.timeLock - block.number);
            revert TimeLock({err: "timeLock preventing execution: ",blockLeft: blk});
        }

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");

        transaction.executed = true;

        unlock();
        
        emit ExecuteTransaction(tx.origin, _txIndex);
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
    function getTransaction(uint _txIndex) public view returns(address to, uint value, bytes memory data, bool executed, uint numConfirmations, uint blockHeight, uint timeLock) {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.blockHeight,
            transaction.timeLock
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
        emit Deposit(tx.origin, msg.value, address(this).balance);
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is not empty
    */
    fallback() external payable {
        emit Deposit(tx.origin, msg.value, address(this).balance);
    }

    /**
    * @notice Utility function to decode and check erc20 serialized calldata
    */
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
}
