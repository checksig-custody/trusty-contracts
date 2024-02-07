// SPDX-License-Identifier: MIT

/**
 * 0xRMS TRUSTY FACTORY v0.1
 * Copyright (c) 2024 Ramzi Bougammoura
 */

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Trusty.sol";

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
    uint256 public _price = 0.1 ether;

    // Map owners address array to Trusty index
    mapping(uint256 => address[]) public trustyOwner;

    /**
    * @notice This method is used to create a Trusty multisignature
    * @param _owners Array of owners' addresses
    * @param _nTX Minimum number of confirmations required to execute a transaction
    */
    function createContract(address[] memory _owners, uint _nTX) public {
        // uncomment and add `payable` modifier to enable price
        //require(msg.value >= _price, "Ether sent is not enough");

        Trusty trusty = new Trusty(_owners, _nTX);
        contracts.push(trusty);        

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
    * @return address[] Returns the Trusty's owners' array
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

    function contractReadTxs(uint256 _contractIndex) public view returns(uint total) {
        uint txTotal = contracts[_contractIndex].getTransactionCount();

        return txTotal;
    }

    function imOwner(uint256 _contractIndex) public view returns(bool) {
        return contracts[_contractIndex].isOwner(tx.origin);
    }

    function getTx(uint256 _contractIndex, uint _txIndex) public view returns(address, uint, bytes memory, bool, uint) {
        return contracts[_contractIndex].getTransaction(_txIndex);
    }
    
    function trustySubmit(uint256 _contractIndex, address _to, uint256 _value, bytes memory _data) public {
        contracts[_contractIndex].submitTransaction(_to, _value, _data);
    }
    
    function trustyConfirm(uint256 _contractIndex, uint _txIndex) public {
        contracts[_contractIndex].confirmTransaction(_txIndex);
    }

    function trustyExecute(uint256 _contractIndex, uint _txIndex) public {
        contracts[_contractIndex].executeTransaction(_txIndex);
    }

    function trustyRevoke(uint256 _contractIndex, uint _txIndex) public {
        contracts[_contractIndex].revokeConfirmation(_txIndex);
    }
    
    function trustyPriceConfig(uint256 price) public onlyOwner returns(uint256) {

        uint256 newPrice = price;
        _price = newPrice;
        return _price;
    }

    /**
    * @dev withdraw sends all the ether in the contract
    * to the owner of the contract
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
