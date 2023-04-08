//const hre = require("hardhat");
//import hre from 'hardhat';
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

const main = async () => {
    const [owner, randomPerson, other, anon] = await hre.ethers.getSigners();
    const ContractFactory = await hre.ethers.getContractFactory("TrustyFactory");
    const Contract = await ContractFactory.deploy();
    await Contract.deployed();
  
    console.log("TrustyFactory Contract deployed to:", Contract.address);
    console.log("TrustyFactory Owner:", owner.address);
  
    
    let owners = [owner.address,randomPerson.address,other.address];
    //console.log("Owner",owners);

    let create = await Contract.createContract(owners,2);
    //let create = await Contract.createContract(owners,3);
    
    let addr = await Contract.contracts(0);
    console.log("created Trusty: ",addr);

    let amount = '2';
    let deposit = await Contract.depositContract(0,amount,{value: ethers.utils.parseEther(amount)});
    //let deposit = await Contract.depositContract({value: hre.ethers.utils.parseEther('2')});
    let balance = await hre.ethers.provider.getBalance(Contract.address);
    console.log("Factory Balance:",balance);

    let txOwners;
    txOwners = await Contract.contractReadOwners(0);
    console.log("ReadOwners:", txOwners);

    let txBalance;
    txBalance = await Contract.contractReadBalance(0);

    console.log("BALANCE: ", txBalance);

    let txTotal;
    txTotal = await Contract.contractReadTxs(0);
    console.log("Total TXs:", txTotal);

    let imOwner = await Contract.imOwner(0)
    console.log("ImOwner? ",imOwner);

    let txSend;
    txSend = await Contract.connect(owner).trustySubmit(0, other.address, 1, 0x00);
    await txSend.wait();
    //txSend = await Contract.trustySubmit(0, other.address, 1, 0x00);
    //console.log("send TXs:", txSend);

    let txGet;
    txGet = await Contract.getTx(0,0);
    console.log("get TXs:", txGet);

    let txConfirm;
    txConfirm = await Contract.connect(randomPerson).trustyConfirm(0,0);
    await txConfirm.wait();

    let txConfirm2;
    txConfirm2 = await Contract.connect(other).trustyConfirm(0,0);
    await txConfirm2.wait();

    let txGet2;
    txGet2 = await Contract.getTx(0,0);
    console.log("get TX2s:", txGet2);

    let txExe = await Contract.connect(owner).trustyExecute(0,0);
    await txExe.wait();
    console.log("Executed TX:", txExe.hash);

    let receiver = await hre.ethers.provider.getBalance(other.address);
    console.log("receiver balance:",receiver);
  };

  function hex_to_ascii(str1)
  {
	  var hex  = str1.toString();
	  var str = '';
	  for (var n = 0; n < hex.length; n += 2) {
		  str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	  }
	  return str;
  }
  
  const runMain = async () => {
    try {
      await main();
      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  
  runMain();