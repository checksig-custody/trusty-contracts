const { ethers } = require("hardhat");

const prompt = require('prompt-sync')();

async function main() {
  const confirmations = parseInt(prompt('How many confirmations are required for the Trusty? '));
  if(isNaN(confirmations)) {throw `You must use a valid number: ${parseInt(confirmations)}`}
  
  const nOwners = parseInt(prompt('How many owners will manage the Trusty? '));
  if(isNaN(nOwners)) {throw `You must use a valid number: ${parseInt(nOwners)}`}

  const owners = []

  if(confirmations === 0 || nOwners === 0 || confirmations < 1 || confirmations > nOwners) {
    throw `Confirmations must be greater than 1 and less than or equal to the numbers of owners: (1 < ${confirmations} <= ${nOwners}) is not a valid expression`
  }
  
  for (var i = 0; i < nOwners; i++){
    const owner = prompt(`Address of the ${i}th owner: `);
    if(!ethers.utils.isAddress(owner)){throw "You must enter a valid string address"}
    owners.push(owner);
  }

  const recovery = prompt(`Insert the RECOVERY address: `)
  if(!ethers.utils.isAddress(recovery)){throw "You must enter a valid string address"}

  const blocklock = parseInt(prompt('How many blocks until RECOVERY mode enabled? '));
  if(isNaN(blocklock)) {throw `You must use a valid number: ${parseInt(blocklock)}`}

  const name = prompt(`Insert a name for your Trusty or leave blank `)

  /*
  A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
  so exchangeContract here is a factory for instances of our Exchange contract.
  */
  const trustyContract = await ethers.getContractFactory("TrustyCold");

  const awareness = prompt('ARE YOU SURE YOU WANT TO DEPLOY? [deploy] or [press any button] to exit: ')==="deploy"?true:false;
  if(!awareness) {
    throw "[Aborting all and exiting...]";
  }

  // here we deploy the contract
  const deployedTrustyContract = await trustyContract.deploy(owners, confirmations, name, recovery, blocklock);
  await deployedTrustyContract.deployed();

  // print the address of the deployed contract
  console.log("TrustyCold Contract Address:", deployedTrustyContract.address);
}

// Call the main function and catch if there is any error
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
