const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-ledger");
require("dotenv").config({ path: ".env" });
const prompt = require('prompt-sync')();

const {PRIVATE_KEY, LEDGER_ADDRESS, MNEMONIC, PASSPHRASE} = process.env;

const useLedger = false;
const ledgerAddress = LEDGER_ADDRESS;

function toHex(str) {
  var result = '';
  for (var i=0; i<str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
}

const main = async () => {

  if(useLedger){
    const txt = toHex("");
    //const message = `0x${txt}`
    const message = "0x5b3078726d735d3a207468697320697320612074657374206d65737361676521";
    const account = ledgerAddress;

    const signature = await hre.network.provider.request({
      method: "personal_sign",
      params: [
        message,
        account,
      ],
    });

    console.log("Signed message", message, "for Ledger account", account, "and got", signature);
  }  

  // Get signers's account object from hardhat runtime environment.
  // By default, Contract instances are connected to the first signer.
  const [owner, randomAccount, other, anonymous] = await hre.ethers.getSigners();

  // Get the contract's code to be deployed from `contracts/TrustyFactory.sol`
  const ContractFactory = await hre.ethers.getContractFactory("TrustyFactory");
  const ContractTrusty = await hre.ethers.getContractFactory("Trusty");

  // Deploy locally the contract and wait for his availability 
  const Contract = await ContractFactory.deploy();
  await Contract.deployed();
  
  console.log("[TrustyFactory address]:", Contract.address);
  console.log("[TrustyFactory Owner address]:", owner.address);

  // `_price` is a public-readable variable that can only be set by the TrustyFactory contract's owner/deployer by calling the proper method
  const previousPrice = await Contract._price();
  console.log(`[previousPrice]: ${previousPrice}`)

  // Owner sets the price
  const setPrice = await Contract.trustyPriceConfig(ethers.utils.parseEther("0.05"));
  console.log(`[setPrice tx hash]: ${JSON.stringify(setPrice.hash)}`)
  
  // Attempt to change the price from a not owner account
  /*
  try {
    const setPriceByNotOwner = await Contract.connect(randomAccount).trustyPriceConfig(ethers.utils.parseEther("0.02"));  
  } catch (error) {
    console.log("[TX Error]: Only the Factory's Owner is able to change the price")
  }
  */
  
  // Check the modified price calling the read-only _price variable
  const actualPrice = await Contract._price();
  console.log(`[actualPrice]: ${actualPrice}`)
  
  // Get the addresses from signers' accounts
  const owners = [owner.address,randomAccount.address, other.address];

  // WHITELIST
  let whitelist = await Contract.connect(owner).addToFactoryWhitelist([randomAccount.address,other.address]);

  // Create a Trusty multisignature
  const create = await Contract.createContract(owners, 2, "first", [anonymous.address,"0xeDaCEf763B85597A517061D276D61947610411D1"], {value:0}); //ethers.utils.parseEther("0.02")
  //const create = await Contract.createContract(owners, 2, "first", [anonymous.address], {value:0}); //ethers.utils.parseEther("0.02")
  
  const Trusty = await ContractTrusty.deploy(owners, 2, "SingleTrusty", [anonymous.address], {value:0});
  await Trusty.deployed();

  // Get created contract address
  const addr = await Contract.contracts(0);
  console.log("[Trusty address]: ", addr);

  // Create a second Trusty
  const create2 = await Contract.createContract(owners, 2, "second", [anonymous.address, ...owners], {value:0});

  // Retrieve the contract's address from Factory calling the method `contracts()` and passing the index number
  const addr2 = await Contract.contracts(1);
  console.log("[Trusty2 address]: ", addr2);

  // Create a third Trusty
  const create3 = await Contract.createContract(owners, 2, "third", [...owners], {value:0}); 
  const addr3 = await Contract.contracts(2);
  console.log("[Trusty3 address]: ", addr3);

  // Create a Trusty whose owners are 1 Externally Owned Account (with private keys) plus the previous Trusties created (without private keys) resulting in a chained tree of Trusty multisignatures 
  const createMix = await Contract.createContract([addr, addr2, addr3], 2, "mixed", [addr, addr2, addr3], {value:0}); 
  const trustyMixAddr = await Contract.contracts(3);
  console.log("[TrustyMIX address]: ", trustyMixAddr);

  // Deposit into a Trusty using the Factory method `depostiContract()` and the index of the Trusty to be funded
  const amount = '123';
  const deposit0 = await Contract.depositContract(0, amount,{value: ethers.utils.parseEther("111")});
  const deposit3 = await Contract.depositContract(3, amount,{value: ethers.utils.parseEther(amount)});

  // Simulate block height progress (mining)
  await mine(1).then(async () => {
    // Get the balance of a Trusty like an RPC
    const factoryBalance = await hre.ethers.provider.getBalance(Contract.address);
    console.log("[Factory balance]:",factoryBalance, Contract.address);
  });

  await mine(1).then(async () => {
    const trustyMixBalance = await hre.ethers.provider.getBalance(trustyMixAddr);  
    console.log("[RPC-trustyMixAddr balance]:",trustyMixBalance, trustyMixAddr);
  });

  // Get balance of Trusty from Factory contract's method
  const txBalance = await Contract.contractReadBalance(3);
  console.log("[Contract call-trustyMixAddr balance]: ", txBalance);

  // Get the Owners of a Trusty
  const txOwners = await Contract.contractReadOwners(3);
  console.log("[ReadOwners]:", txOwners);

  // Get total txs from Trusty
  const txTotal = await Contract.contractReadTxs(0);
  console.log("Total TXs:", txTotal);

  // Am I one of the owners of a Trusty?
  const imOwner = await Contract.imOwner(0);
  console.log("[ImOwner?] ",imOwner);

  //const setWhitelist = await Contract.connect(owner).addToTrustyWhitelist(0,[anonymous.address]);

  const getWhitelist = await Contract.connect(owner).getTrustyWhitelist(0)

  //console.log(`[whitelisted]: ${getWhitelist}`)

  // Propose to submit a tx from a Trusty
  const txSend = await Contract.connect(owner).trustySubmit(0, anonymous.address, 1, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000", 0);
  //const txSend = await Contract.connect(owner).trustySubmit(0, anonymous.address, 1, Buffer.from("This is a test for catching calldata..."), 0);
  //const txSend = await Contract.connect(owner).trustySubmit(0, anonymous.address, 1, 0x0, 0);
  await txSend.wait();

  // Get Trusty txs status
  const txGet = await Contract.getTx(0,0);
  //console.log("[get TX status]:", txGet);

  // Confirm a tx from an account of owners
  const txConfirm = await Contract.connect(randomAccount).trustyConfirm(0, 0);
  await txConfirm.wait();

  // Confirm a tx from another account of owners
  const txConfirm2 = await Contract.connect(other).trustyConfirm(0, 0);
  await txConfirm2.wait();

  await mine(1).then(async () => {
    // Execute a tx
    const txExe = await Contract.connect(owner).trustyExecute(0,0);
    await txExe.wait();
    //console.log("[Executed TX hash]:", txExe.hash);

    // Check the received amount
    const receiver = await hre.ethers.provider.getBalance(other.address);
    console.log("[Receiver balance]:", receiver, other.address);

    // Get Trusty txs status x2
    const txGet2 = await Contract.getTx(0, 0);
    //console.log("[get TX status updated]:", txGet2);
  });

  const totTrusty = await Contract.totalTrusty();
  for (let i = 0; i < totTrusty; i++) {
    const id = await Contract.trustyID(i)
    console.log(`[${i}]: ${id}`)
  }

  //const data = await Trusty.decodeData("0xa9059cbb00000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000")
  //console.log(`[data]: ${data}`)
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
