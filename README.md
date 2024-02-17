# Trusty-Contracts Project

## Setup

- Clone the repository and `cd` into it
- Create a `.env` file and put in the environment variables (see `.env.template`).
- It is recommended to insert in the `.env` the variable `PRIVATE_KEY` only when you need actually to deploy the contract on the network and removing it immediately after.
- To run the smart contract locally just use the command `npm run start`, but to 'deploy' on blockchain remember to check and eventually edit the file `hardhat.config.js` as it contains the right hardhat framework's configurations `/*commented*/` to run locally instead of deploying the contract on the network specified.

## Install, compile, run, deploy and verify

```shell
# Clone the repository
git clone https://github.com/Ramsi88/trusty-contracts.git

# Change directory
cd trusty-contracts

# Install dependencies
npm i
npm update

# Compile contract bytecode
npx hardhat compile

# Run contract locally
npx hardhat run scripts/run.js

# Deploy contract to <network>=goerli/sepolia/mumbai
npx hardhat run scripts/deploy.js --network mainnet 

# Verify contract on <network>=goerli/sepolia/mumbai
npx hardhat verify --network goerli 0xabcdef12345... "ConstructorArg1" "ConstructorArg2" 
```

## Scripts commands shortcut

```shell
# Compile
npm run compile

# Start
npm run start

# Deploy
npm run deploy
```

## Integration tests

```shell
# Run all tests
npm run test

# Test with GAS fee estimation
npm run test-gas

# Test all
npm run test-all

# Run a specific test-id
npm run test-id -- 'Create trusty test'
```

## Basic HardHat usage

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
