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

  const ABSOLUTE_TIMELOCK = 28800;
  const OFFSET = 120;
  const BLOCKLOCK = 28800

  // Get signers's account object from hardhat runtime environment.
  // By default, Contract instances are connected to the first signer.
  const [owner, randomAccount, other, anonymous] = await hre.ethers.getSigners();

  // Get the contract's code to be deployed from `contracts/TrustyFactory.sol`
  const ContractFactory = await hre.ethers.getContractFactory("TrustyFactory");
  const ContractTrusty = await hre.ethers.getContractFactory("Trusty");
  const ContractAdvanced = await hre.ethers.getContractFactory("TrustyAdvanced");
  const ContractRecovery = await hre.ethers.getContractFactory("Recovery");
  const ContractERC20 = await hre.ethers.getContractFactory("ERC20");

  // Deploy locally the contract and wait for his availability 
  const Contract = await ContractFactory.deploy();
  await Contract.deployed();
  
  console.log("[TrustyFactory address]:", Contract.address);
  console.log("[TrustyFactory Owner address]:", owner.address);

  // `_price` is a public-readable variable that can only be set by the TrustyFactory contract's owner/deployer by calling the proper method
  const previousPrice = await Contract._price();
  //console.log(`[previousPrice]: ${previousPrice}`)

  // Owner sets the price
  const setPrice = await Contract.trustyPriceConfig(ethers.utils.parseEther("0.05"));
  //console.log(`[setPrice tx hash]: ${JSON.stringify(setPrice.hash)}`)
  
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

  // RECOVERY TRUSTY
  //const recovery = await Contract.createContract(owners, 2, "RECOVERY TRUSTY", owners, owner.address, {value:0});
  //const recoveryAddr = await Contract.contracts(0);

  //const recovery = await ContractTrusty.deploy(owners, 2, "RECOVERY TRUSTY", owners, owner.address, {value:0});
  const recovery = await ContractRecovery.deploy(owners, 2, "RECOVERY TRUSTY", {value:0});
  await recovery.deployed()
  const recoveryAddr = recovery.address;

  console.log(`[RECOVERY ADDR]: ${recoveryAddr}`);

  // ERC20
  const erc20 = await ContractERC20.deploy()
  await erc20.deployed()
  const erc20Addr = erc20.address;
  console.log(`[ERC20 address]: ${erc20Addr}`)

  // Create a Trusty multisignature
  const create = await Contract.createContract([...owners], 2, "first", {value:0}); //ethers.utils.parseEther("0.02")
  //const create = await Contract.createContract(owners, 2, "first", [anonymous.address], {value:0}); //ethers.utils.parseEther("0.02")
  
  const Trusty = await ContractTrusty.deploy(owners, 2, "SingleTrusty", {value:0});
  await Trusty.deployed();

  const TrustyAdvanced = await ContractAdvanced.deploy(owners, 2, "AdvancedTrusty", [anonymous.address, "0xeDaCEf763B85597A517061D276D61947610411D1"], recoveryAddr, BLOCKLOCK, owners, {value:0});
  await TrustyAdvanced.deployed();

  // Get created contract address
  const addr = await Contract.contracts(0);
  console.log("[Trusty address]: ", addr);

  // Create a second Trusty
  const create2 = await Contract.createContract([...owners], 2, "second", {value:0});

  // Retrieve the contract's address from Factory calling the method `contracts()` and passing the index number
  const addr2 = await Contract.contracts(1);
  console.log("[Trusty2 address]: ", addr2);

  // Create a third Trusty
  const create3 = await Contract.createContract([...owners], 2, "third", {value:0}); 
  const addr3 = await Contract.contracts(2);
  console.log("[Trusty3 address]: ", addr3);

  // Create a Trusty whose owners are 1 Externally Owned Account (with private keys) plus the previous Trusties created (without private keys) resulting in a chained tree of Trusty multisignatures 
  const createMix = await Contract.createContract([addr, addr2, addr3], 2, "mixed", {value:0}); 
  const trustyMixAddr = await Contract.contracts(3);
  console.log("[TrustyMIX address]: ", trustyMixAddr);

  // Deposit into a Trusty using the Factory method `depostiContract()` and the index of the Trusty to be funded
  const amount = '123';
  const deposit1 = await Contract.depositContract(0, amount,{value: ethers.utils.parseEther("111")});
  const deposit3 = await Contract.depositContract(3, amount,{value: ethers.utils.parseEther(amount)});
  const depositAdvanced = await owner.sendTransaction({to: TrustyAdvanced.address, value: amount});//await Contract.depositContract(3, amount,{value: ethers.utils.parseEther(amount)});

  // Simulate block height progress (mining)
  await mine(1).then(async () => {
    // Get the balance of a Trusty like an RPC
    const factoryBalance = await hre.ethers.provider.getBalance(Contract.address);
    //console.log("[Factory balance]:",factoryBalance, Contract.address);
  });

  await mine(1).then(async () => {
    const trustyMixBalance = await hre.ethers.provider.getBalance(trustyMixAddr);  
    //console.log("[RPC-trustyMixAddr balance]:",trustyMixBalance, trustyMixAddr);
  });

  // Get balance of Trusty from Factory contract's method
  const txBalance = await Contract.contractReadBalance(3);
  //console.log("[Contract call-trustyMixAddr balance]: ", txBalance);

  // Get the Owners of a Trusty
  const txOwners = await Contract.contractReadOwners(3);
  //console.log("[ReadOwners]:", txOwners);

  // Get total txs from Trusty
  const txTotal = await Contract.contractReadTxs(0);
  //console.log("Total TXs:", txTotal);

  // Am I one of the owners of a Trusty?
  const imOwner = await Contract.imOwner(0);
  //console.log("[ImOwner?] ",imOwner);

  // Propose to submit a tx from a Trusty
  const txSend = await Contract.connect(owner).trustySubmit(0, anonymous.address, 1, "0xa9059cbb000000000000000000000000eDaCEf763B85597A517061D276D61947610411D10000000000000000000000000000000000000000000000000de0b6b3a7640000");
  //const txSend = await Contract.connect(owner).trustySubmit(1, anonymous.address, 1, Buffer.from("This is a test for catching calldata..."), 0);
  //const txSend = await Contract.connect(owner).trustySubmit(1, anonymous.address, 1, 0x0, 0);
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

  await mine(ABSOLUTE_TIMELOCK + 108).then(async () => {
    // Execute a tx
    const txExe = await Contract.connect(owner).trustyExecute(0,0);
    await txExe.wait();
    //console.log("[Executed TX hash]:", txExe.hash);

    // Check the received amount
    const receiver = await hre.ethers.provider.getBalance(other.address);
    //console.log("[Receiver balance]:", receiver, other.address);

    // Get Trusty txs status x2
    const txGet2 = await Contract.getTx(0, 0);
    //console.log("[get TX status updated]:", txGet2);    
  });

  const totTrusty = await Contract.totalTrusty();
  for (let i = 0; i < totTrusty; i++) {
    const id = await Contract.trustyID(i)
    console.log(`[${i}]: ${id}`)
  }

  // DISASTER RECOVERY 
  //const recover = await Trusty.connect(recoveryAddr).recover(owner.address, Buffer.from("data"));
  const recoveryWhitelist = await recovery.addAddressToRecoveryWhitelist([addr,addr2,addr3,trustyMixAddr,TrustyAdvanced.address]);
  await recoveryWhitelist.wait()

  const recoveryName = await recovery.id()
  console.log(recoveryName)
  
  /*
  // POR
  const POR = await recovery.submitTransaction(addr, 0, "0x5c470ecb", 0) // 0x5c470ecb 0xa69df4b5
  await POR.wait()

  const porConfirm = await recovery.connect(other).confirmTransaction(0);
  await porConfirm.wait();

  const porConfirm2 = await recovery.connect(randomAccount).confirmTransaction(0);
  await porConfirm2.wait();

  await mine(
    30000//ABSOLUTE_TIMELOCK + 120
    ).then(async () => {
    const porExe = await recovery.connect(owner).executeTransaction(0);
    await porExe.wait();
  })
  */
  
  //0xce746024
  //const recover = await recovery.submitTransaction(addr , 0, Buffer.from(""), 0);
  const recover = await recovery.submitTransaction(TrustyAdvanced.address , 0, "0xce746024"); //ETH native
  //const recover = await recovery.submitTransaction(addr , 0, "0x7c0f1ee7", 0); //ERC20
  await recover.wait();

  
  //const recoTx = await Contract.connect(owner).trustySubmit(0, addr, 0, "0x379f4e66000000000000000000000000a16E02E87b7454126E5E10d957A927A7F5B5d2be0000000000000000000000000000000000000000000000000000000000000000", 0);

  const recoConfirm = await recovery.connect(other).confirmTransaction(0);
  await recoConfirm.wait();

  const recoConfirm2 = await recovery.connect(randomAccount).confirmTransaction(0);
  await recoConfirm2.wait();

  await mine(ABSOLUTE_TIMELOCK + 120).then(async () => {
    // ATTACK RECOVERY
    //const attack = await Trusty.connect(anonymous).recover();
    //await attack.wait()
    //console.log("[ATTACK]",attack);

    const recoExe = await recovery.connect(owner).executeTransaction(0);
    await recoExe.wait();
    //console.log("[recoExe TX hash]:", recoExe.hash);
  })

  //const addrBalance = await Contract.contractReadBalance(0);
  //console.log("[Trusty addr balance post recover]: ", addrBalance);
  const addrBalance = await TrustyAdvanced.getBalance();
  console.log("[TrustyAdvanced addr balance post recover]: ", addrBalance);

  const recoBalance = await await hre.ethers.provider.getBalance(recoveryAddr);
  console.log("[Recovery balance post recover]: ", recoBalance);

  const erc20bal = await erc20.connect(owner).balanceOf(owner.address)
  //console.log(`[Erc20bal]: ${erc20bal}`)

  const erc20approve = await erc20.connect(owner).approve(TrustyAdvanced.address, "100000000000000000000000000")
  await erc20approve.wait()

  const erc20transfer = await erc20.connect(owner).transfer(TrustyAdvanced.address, "100000000000000000000000000")
  await erc20transfer.wait()

  const erc20Trustybal = await erc20.connect(owner).balanceOf(TrustyAdvanced.address)
  //console.log(`[Erc20Trustybal-preRecover]: ${erc20Trustybal}`)

  //52b7d2dcc80cd2e4000000//52b7d2dcc80cd400000000//52b7d2cee7561f3c9c0000
  //0x8980f11f000000000000000000000000Dc64a140Aa3E981100a9becA4E685f962f0cF6C900000000000000000000000000000000000000000052b7d2dcc80cd2e4000000
  //0x8980f11f000000000000000000000000326C977E6efc84E512bB9C30f76E30c160eD06FB00000000000000000000000000000000000000000052b7d2cee7562000000000
  //0x9e8c708e000000000000000000000000Dc64a140Aa3E981100a9becA4E685f962f0cF6C9
  const recoverErc20 = await recovery.submitTransaction(TrustyAdvanced.address , 0, "0x9e8c708e000000000000000000000000Dc64a140Aa3E981100a9becA4E685f962f0cF6C9"); //ERC20
  await recoverErc20.wait();

  const recoConfirmErc20 = await recovery.connect(other).confirmTransaction(1);
  await recoConfirmErc20.wait();

  const recoConfirm2Erc20 = await recovery.connect(randomAccount).confirmTransaction(1);
  await recoConfirm2Erc20.wait();

  await mine(ABSOLUTE_TIMELOCK + 120).then(async () => {
    const recoExe = await recovery.connect(owner).executeTransaction(1);
    await recoExe.wait();
    //console.log("[recoExeErc20 TX hash]:", recoExe.hash);
  })
  
  const erc20Recobal = await erc20.connect(owner).balanceOf(recoveryAddr)
  console.log(`[Erc20Recobal]: ${erc20Recobal}`)

  const erc20Trustybal2 = await erc20.connect(owner).balanceOf(addr)
  console.log(`[Erc20Trustybal-postRecover]: ${erc20Trustybal2}`)

  //console.log(ethers.utils.parseEther("100000000"))
  //console.log(ethers.utils.hexlify(ethers.utils.parseUnits("99999999")))
  
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
