//const hre = require("hardhat");
//import hre from 'hardhat';
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

const main = async () => {

    // Set different account based on role
    const [owner, randomPerson, other, anon] = await hre.ethers.getSigners();

    // Istantiate the Factory
    const ContractFactory = await hre.ethers.getContractFactory("TrustyFactory");

    // Deploy the Factory
    const Contract = await ContractFactory.deploy();

    // Await for deploy
    await Contract.deployed();  
    console.log("TrustyFactory Contract deployed to:", Contract.address);
    console.log("TrustyFactory Owner:", owner.address);
  
    // Get price
    let previous_price = await Contract._price();
    console.log(`price:${previous_price}`)

    // Owner set price
    let set_price = await Contract.trustyPriceConfig(ethers.utils.parseEther("2"));
    //console.log(`actual price:${JSON.stringify(set_price.hash)}`);

    // Check modified price
    let actual_price = await Contract._price();
    console.log(`price:${actual_price}`)
    
    // Get addresses from accouns
    let owners = [owner.address,randomPerson.address,other.address];
    //console.log("Owner",owners);

    // Create a trusty
    let create = await Contract.createContract(owners,2);
    //let create = await Contract.createContract(owners,3);
    
    // Get created contract address
    let addr = await Contract.contracts(0);
    console.log("created Trusty: ",addr);

    // Deposit into a Trusty
    let amount = '2';
    let deposit = await Contract.depositContract(0,amount,{value: ethers.utils.parseEther(amount)});
    //let deposit = await Contract.depositContract({value: hre.ethers.utils.parseEther('2')});

    // Get the balance of a Trusty
    let balance = await hre.ethers.provider.getBalance(Contract.address);
    console.log("Factory Balance:",balance);

    // Get Owners of Trusty
    let txOwners;
    txOwners = await Contract.contractReadOwners(0);
    console.log("ReadOwners:", txOwners);

    // Get balance of Trusty
    let txBalance;
    txBalance = await Contract.contractReadBalance(0);

    console.log("BALANCE: ", txBalance);

    // Get total txs from Trusty
    let txTotal;
    txTotal = await Contract.contractReadTxs(0);
    console.log("Total TXs:", txTotal);

    // I'm one of the owners of a Trusty?
    let imOwner = await Contract.imOwner(0)
    //console.log("ImOwner? ",imOwner);

    // Propose to submit a tx from a Trusty
    let txSend;
    txSend = await Contract.connect(owner).trustySubmit(0, other.address, 1, 0x00);
    await txSend.wait();
    //txSend = await Contract.trustySubmit(0, other.address, 1, 0x00);
    //console.log("send TXs:", txSend);

    // Get Trusty txs status
    let txGet;
    txGet = await Contract.getTx(0,0);
    //console.log("get TXs:", txGet);

    // Confirm a tx from an account of owners
    let txConfirm;
    txConfirm = await Contract.connect(randomPerson).trustyConfirm(0,0);
    await txConfirm.wait();

    // Confirm a tx from another account of owners
    let txConfirm2;
    txConfirm2 = await Contract.connect(other).trustyConfirm(0,0);
    await txConfirm2.wait();

    // Get Trusty txs status x2
    let txGet2;
    txGet2 = await Contract.getTx(0,0);
    //console.log("get TX2s:", txGet2);

    // Execute a tx
    let txExe = await Contract.connect(owner).trustyExecute(0,0);
    await txExe.wait();
    //console.log("Executed TX:", txExe.hash);

    // Check the received amount
    let receiver = await hre.ethers.provider.getBalance(other.address);
    //console.log("receiver balance:",receiver);
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