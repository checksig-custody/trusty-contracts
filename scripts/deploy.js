const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { CONTRACT_ADDRESS } = require("../constants");

async function main() {
  const ContractAddress = CONTRACT_ADDRESS;
  /*
  A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
  so exchangeContract here is a factory for instances of our Exchange contract.
  */
  const factoryContract = await ethers.getContractFactory("TrustyFactory");

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