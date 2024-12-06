# Trusty-Contracts Project

## Description

This fork aims to reproduce the CheckSig's Bitcoin custody protocol on Ethereum ecosystem.
Each multisignature contract has a flow to propose, confirm and execute a proposed transaction reached the established quorum by privileged owners.
Funds will be deposited in the Frozen contract and after a quorum of 2+3/9 can be moved in the Cold contract.
The Cold contract has a waiting window of X blocks from the proposal of a withdrawal transaction to its execution that prevents the moving of funds.
The Recovery contract is a 2/3 multisignature that can be used to recover funds (Ether and ERC20) from the Frozen and/or Cold if/when the required conditions are met.
In the Frozen case, the Recovery contract can recover funds only after X blocks from the last executed transaction.
In the Cold case, the Recovery contract can recover funds always.

Each `owner` of a contract has the privilege to propose, confirm or execute a transaction with required conditions excluding the Frozen that has a custom workflow where thew quorum is reached with 2 authorizations plus 3 confirmations between different roles.
In the TrustyFrozen case the roles are divided in `authorizers` which can only propose and execute a transaction, and the Federation agents which can only confirm a proposed transaction.

- Recovery

- Frozen

- Cold

## Setup

- Clone the repository and `cd` into it
- Create a `.env` file and put in the environment variables (see `.env.template`).
- To run and test the smart contract locally just use the command `npm run start` and `npm run test`.
- It is recommended to insert in the `.env` the variable `PRIVATE_KEY` only when you need actually to deploy the contract on the desired network and removing it immediately after.
- To 'deploy' the smart contract on blockchain remember to check and eventually edit the file `hardhat.config.js` removing the comment on the line containing the code `//accounts: [PRIVATE_KEY]` in the desired network.
- It is possible to deploy the contracts using a Ledger wallet hardware device answering correctly to the interactive prompt that will appear when running the `npm run deploy`.
- It is possible to deploy a single Trusty multi-signature without the need to deploy the Trusty Factory deployer using the command `npm run deploy-single`.

## Install, compile, run, deploy and verify

```shell
# Clone the repository
git clone https://github.com/Ramsi88/trusty-contracts.git

# Change directory
cd trusty-contracts

# Install dependencies
npm i

# Update dependencies
npm update

# Start
npm run start

# Deploy locally
npm run deploy hardhat

# Deploy on Testnets
npm run deploy <goerli>|<sepolia>|<mumbai>

# Deploy on Mainnet
npm run deploy mainnet

# Verify contract
npm run verify mainnet <Contract_Address> "ConstructorArg1" "ConstructorArg2"

# Deploy a single Trusty without Factory
npm run deploy-single
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

# Run a local node
npx hardhat node

# Test
npx hardhat test
REPORT_GAS=true npx hardhat test

# Compile contract bytecode
npx hardhat compile

# Run contract locally
npx hardhat run scripts/run.js

# Deploy
npx hardhat run scripts/deploy.js

# Deploy contract to <network>=goerli/sepolia/mumbai
npx hardhat run scripts/deploy.js --network mainnet 

# Verify contract on <network>=goerli/sepolia/mumbai
npx hardhat verify --network goerli 0xabcdef12345... "ConstructorArg1" "ConstructorArg2" 
```
