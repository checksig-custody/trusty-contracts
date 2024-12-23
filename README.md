# CheckSig Custody - Trusty Multi-Signature Smart Contracts

## Description

This fork aims to reproduce the CheckSig's Bitcoin custody's protocol on Ethereum ecosystem.
Each multisignature contract has a flow to propose, confirm, revoke and execute a proposed transaction when the established quorum is reached by the `owners`.
Funds will be deposited in the `Frozen` contract; after a quorum of minimum X authorizations of `authorizers` plus X/X confirmations of `owners` that are not authorizers the funds can be moved in the proposed transaction's `to` address (this will be mostly the Cold contract address).
The `Cold` contract has a waiting window of X blocks from the proposal of a withdrawal transaction to its execution that prevents the moving of the funds.
The `Recovery` contract is a X/X multisignature that can be used to recover funds (Ether and ERC20) either from the Frozen and/or Cold if/when the required conditions are met.
In the Frozen contract case, the Recovery contract can recover funds only after X blocks from the last executed transaction.
In the Cold contract case, the Recovery contract can always recover the funds.

Each `owner` of a contract has the privilege to propose, confirm, revoke or execute a transaction when required conditions are met excluding the Frozen that has a custom workflow where the quorum is reached with minimum X authorizations from `authorizers` plus X confirmations of `owners` that are not authorizers.
In the Frozen case the roles are divided in `authorizers` which can only propose, authorize and execute a transaction, and the `owners` without authorizer role which can only confirm or revoke confirmation of a proposed transaction.

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
