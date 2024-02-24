const { ethers } = require("hardhat");
const prompt = require('prompt-sync')();

async function main() {
  /*
  A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
  so exchangeContract here is a factory for instances of our Exchange contract.
  */
  const factoryContract = await ethers.getContractFactory("TrustyFactory");

  const awareness = prompt('ARE YOU SURE YOU WANT TO DEPLOY? [deploy] or [press any button] to exit: ')==="deploy"?true:false;
  if(!awareness) {
    throw "[Aborting all and exiting...]";
  }

  // here we deploy the contract
  const deployedFactoryContract = await factoryContract.deploy(
    //ContractAddress
  );
  await deployedFactoryContract.deployed();

  // print the address of the deployed contract
  console.log("Factory Contract Address:", deployedFactoryContract.address);
}

// Call the main function and catch if there is any error
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
