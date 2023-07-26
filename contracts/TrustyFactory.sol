// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import './Trusty.sol';

//import "hardhat/console.sol";

contract TrustyFactory is Ownable {
    // indexed
    Trusty[] public contracts;

    uint256 public totalTrusty = 0;

    //  _price is the price of one NFT
    uint256 public _price = 0.1 ether;

    mapping(uint256 => address[]) public trustyOwner;

    //address[] memory _owners, uint _numConfirmationsRequired
    //string memory _owner1, string memory _owner2, string memory _owner3 ,uint _nTX
    // payable
    function createContract(address[] memory _owners, uint _nTX) public {
        //require(msg.value >= _price, "Ether sent is not correct");

        //address[] storage _owners = abi.encodePacked('["', _owner1,'", ','"', _owner2,'", ','"', _owner3,'"],', uint(_nTX)); // ["","",""],3
        //console.log(_owners, _nTX);

        //abi.encodePacked('["',address(_owner1),'", ','"', address(_owner2),'", ','"' address(_owner3),'"],'), uint _nTX
        Trusty trusty = new Trusty(_owners, _nTX); // ContractToGenerate.sol
        contracts.push(trusty);        

        trustyOwner[totalTrusty] = _owners;

        totalTrusty++;

        //return trusty;        
    }

    function depositContract(uint256 _contractIndex, uint _amount) public payable {
        
        //payable(msg.sender).transfer(1 ether);

        //payable(contracts[_contractIndex]).transfer(1 ether);

        //Send Ethers (transfer, send, call)

        //Method 1 transfer (2300 gas, throw error) revert tx
        //payable(msg.sender).transfer(address(this).balance);

        //Method 2 send (2300 gas, returns bool) no revert
        //bool success = payable(msg.sender).send(address(this).balance);
        //require(success, "failed send withdraw tx"); // revert forced

        //Method 3 call (forward all or set gas, returns bool)
        //(bool success, bytes memory dataReturned) = payable(contracts[_contractIndex]).call{value: _amount }("");
        (bool success, ) = payable(contracts[_contractIndex]).call{value: _amount }("");
        require(success, "failed deposit to trusty"); // revert forced
    }

    function contractAction(uint256 _contractIndex, uint256 _dataToStore) public {
        //Address
        //ABI Application Binary Interface
        //Trusty contract = Trusty(Trusty[_contractIndex]);
        //contract.action(_dataToStore);
    }

    function contractReadOwners(uint256 _contractIndex) public view returns(address[] memory) {
        //Trusty trusty = Trusty(Trusty[_contractIndex]);
        return contracts[_contractIndex].getOwners();
    }

    function contractReadBalance(uint256 _contractIndex) public view returns(uint256) {
        //Trusty trusty = Trusty(Trusty[_contractIndex]);
        return contracts[_contractIndex].getBalance();
    }

    function contractReadTxs(uint256 _contractIndex) public view returns(
        uint total
        //address to,
        //uint value,
        //bytes memory data,
        //bool executed,
        //uint numConfirmations
    ) 
    {
        uint txTotal = contracts[_contractIndex].getTransactionCount();

        return txTotal;
        /*
        for (uint i = 0; i < total; i++) {
            return (contracts[_contractIndex].getTransaction(i));
        }
        */
        //return (contracts[_contractIndex].getTransaction(0));
    }

    function imOwner(uint256 _contractIndex) public view returns(bool) {
        return contracts[_contractIndex].isOwner(tx.origin);
    }

    function getTx(uint256 _contractIndex, uint _txIndex) public view returns(
        address,
        uint,
        bytes memory,
        bool,
        uint
    ) {
        return contracts[_contractIndex].getTransaction(_txIndex);
    }
    
    function trustySubmit(
        uint256 _contractIndex,
        address _to,
        uint256 _value,
        bytes memory _data
    ) public {
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
        uint256 new_price = price;
        _price = new_price;
        return _price;
    }

    /**
    * @dev withdraw sends all the ether in the contract
    * to the owner of the contract
    */
    function withdraw() public onlyOwner  {
        address _owner = owner();
        uint256 amount = address(this).balance;
        (bool sent, ) =  _owner.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}
}