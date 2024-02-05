# Trusty-Contracts Project

# Setup:
- Clone the repository and `cd` into it
- Create a `.env` and put in the environment variables as `env_example.txt`.
- It is recommended to insert in the `.env` the variable `PRIVATE_KEY` only when you need actually to deploy the contract on the network and removing it immediately after.
- When you need to run the smart contract locally remember to check and eventually rename the file `hardhat.config.js` into for example `hardhatBACKUP.config.js` and instead rename the file `hardhatLOCAL.config.js` to `hardhat.config.js` as it contains the right hardhat framework configurations to run locally instead of deploying the contract on the network.

# Install, compile, run, deploy and verify:
```shell
# Clone the repository
git clone https://github.com/Ramsi88/trusty-contracts.git

# Change directory
cd trusty-contracts

# Install dependencies
npm i

# Compile contract bytecode
npx hardhat compile

# Run contract locally
npx hardhat run scripts/run.js

# Deploy contract to <network>=goerli/sepolia/mumbai
npx hardhat run scripts/deploy.js --network mainnet 

# Verify contract on <network>=goerli/sepolia/mumbai
npx hardhat verify --network goerli 0xabcdef12345... "ConstructorArg1" "ConstructorArg2" 
```

# Integration tests
```shell
# Run all tests
npm run test

# Run a specific test-id
npm run test-id -- 'Create trusty test'
```

# Basic HardHat usage:
```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
