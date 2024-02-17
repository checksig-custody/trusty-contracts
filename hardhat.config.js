require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

const {INFURA_API_KEY, COINMARKETCAP_API_KEY, ETHERSCAN_API_KEY, QUICKNODE_HTTP_URL, PRIVATE_KEY, MNEMONIC, PASSPHRASE} = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    version:"0.8.13",
    optimizer: true,
    runs: 200
  },
  gasReporter: {
    enabled: true,
    //outputFile: "gas-report/gas-report.txt",
    noColors: false,
    currency: "EUR",
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "ETH"
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  networks: {
    localhost: {
      url: "https://127.0.0.1:8545"
    },
    hardhat: {
      mining: {
        auto: true,
        //interval: 3000,
        // mempool: {
        //   order: "fifo"
        // }
      }
    },
    // Uncomment when you need to deploy and there is a PRIVATE_KEY in .env file
    /*
    mainnet: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: PASSPHRASE + ""
      },
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    mumbai: {
      url: QUICKNODE_HTTP_URL,
      accounts: [PRIVATE_KEY],
		},
    */
  }
};
