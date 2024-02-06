const { ethers } = require("hardhat");

const main = async () => {

  // owner
  // randomPerson
  // other  
  const [owner, randomPerson, other] = await hre.ethers.getSigners();

  const ContractFactory = await hre.ethers.getContractFactory("TrustyFactory");

  const Contract = await ContractFactory.deploy();
  await Contract.deployed();  
  console.log("TrustyFactory Contract deployed to:", Contract.address);
  console.log("TrustyFactory Owner:", owner.address);

  // Get price
  const previous_price = await Contract._price();
  //console.log(`price:${previous_price}`)

  // Owner set price
  const set_price = await Contract.trustyPriceConfig(ethers.utils.parseEther("0.02"));
  //console.log(`actual price:${JSON.stringify(set_price.hash)}`);

  // Check modified price
  let actual_price = await Contract._price();
  console.log(`price:${actual_price}`)
  
  // Get addresses from accouns
  let owners = [owner.address,randomPerson.address, other.address];
  //console.log("Owner",owners);

  // Create a trusty
  let create = await Contract.createContract(owners, 2, {value:0}); //ethers.utils.parseEther("0.02")
  //let create = await Contract.createContract(owners,3);
  
  // Get created contract address
  let addr = await Contract.contracts(0);
  console.log("created Trusty: ", addr);

  // Create a second trusty
  let create2 = await Contract.createContract(owners, 2, {value:0}); //ethers.utils.parseEther("0.02")
  let addr2 = await Contract.contracts(1);
  console.log("created Trusty2: ", addr2);

  // Create a third trusty
  let create3 = await Contract.createContract(owners, 2, {value:0}); //ethers.utils.parseEther("0.02")
  let addr3 = await Contract.contracts(2);
  console.log("created Trusty3: ", addr3);

  // Create the mix trusty
  let createMix = await Contract.createContract([addr, addr2, addr3], 2, {value:0}); //ethers.utils.parseEther("0.02")
  let addrMix = await Contract.contracts(3);
  console.log("created TrustyMIX: ", addrMix);

  // Deposit into a Trusty
  let amount = '2';
  let deposit = await Contract.depositContract(3, amount,{value: ethers.utils.parseEther(amount)});
  //let deposit = await Contract.depositContract({value: hre.ethers.utils.parseEther('2')});

  // Get the balance of a Trusty
  let balance = await hre.ethers.provider.getBalance(Contract.address);
  let balanceMix = await hre.ethers.provider.getBalance(addrMix);
  //console.log("Factory Balance:",balance);
  //console.log("Mix Balance:",balanceMix);

  // Get Owners of Trusty
  let txOwners;
  txOwners = await Contract.contractReadOwners(3);
  console.log("ReadOwners:", txOwners);

  // Get balance of Trusty
  let txBalance;
  //txBalance = await Contract.contractReadBalance(0);
  txBalance = await Contract.contractReadBalance(3);

  console.log("BALANCE: ", txBalance);

  // Get total txs from Trusty
  let txTotal;
  //txTotal = await Contract.contractReadTxs(0);
  //console.log("Total TXs:", txTotal);

  // I'm one of the owners of a Trusty?
  //let imOwner = await Contract.imOwner(0)
  //console.log("ImOwner? ",imOwner);

  // Propose to submit a tx from a Trusty
  let txSend;
  txSend = await Contract.connect(owner).trustySubmit(0, other.address, 1, 0x00);
  await txSend.wait();
  //txSend = await Contract.trustySubmit(0, other.address, 1, 0x00);
  //console.log("send TXs:", txSend);

  // Get Trusty txs status
  let txGet;
  //txGet = await Contract.getTx(0,0);
  //console.log("get TXs:", txGet);

  // Confirm a tx from an account of owners
  let txConfirm;
  txConfirm = await Contract.connect(randomPerson).trustyConfirm(0, 0);
  await txConfirm.wait();

  // Confirm a tx from another account of owners
  let txConfirm2;
  txConfirm2 = await Contract.connect(other).trustyConfirm(0, 0);
  await txConfirm2.wait();

  // Get Trusty txs status x2
  let txGet2;
  txGet2 = await Contract.getTx(0, 0);
  //console.log("get TX2s:", txGet2);

  // Execute a tx
  //let txExe = await Contract.connect(owner).trustyExecute(0,0);
  //await txExe.wait();
  //console.log("Executed TX:", txExe.hash);

  // Check the received amount
  let receiver = await hre.ethers.provider.getBalance(other.address);
  //console.log("receiver balance:",receiver);
};

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
