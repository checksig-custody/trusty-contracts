require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ledger");
require("@nomiclabs/hardhat-solhint");
require("dotenv").config({ path: ".env" });

require("hardhat-tracer");

const prompt = require('prompt-sync')();

let input = false
if(
  process.argv.length === 2 && 
  process.argv[1].includes("scripts/deployRecovery.js") ||
  process.argv[1].includes("scripts/deployCold.js") ||
  process.argv[1].includes("scripts/deployFrozen.js")
  ){
  input = prompt('Would you like to use HW Ledger? [y] or [press any button] to skip: ')==="y"?true:false;
}

const {INFURA_API_KEY, COINMARKETCAP_API_KEY, ETHERSCAN_API_KEY, QUICKNODE_HTTP_URL, PRIVATE_KEY, LEDGER_ADDRESS, MNEMONIC, PASSPHRASE} = process.env;

const gasReport = true;
const gasPrice = 10;

// Set to `true` and insert the `ledgerAddress` that will be used to deploy 
const useLedger = input;
const ledgerAddress = LEDGER_ADDRESS;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

if(useLedger) {
  task("sign", "Signs a message with ledger", async (_, hre) => {
    const message =
      "0x5b3078726d735d3a207468697320697320612074657374206d65737361676521";
    const account = ledgerAddress;

    const signature = await hre.network.provider.request({
      method: "personal_sign",
      params: [
        message,
        account,
      ],
    });

    console.log("Signed message", message, "for Ledger account", account, "and got", signature);
  });
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
if(useLedger) {
  module.exports = {
    defaultNetwork: "hardhat",
    solidity: {
      version:"0.8.28",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    },
    gasReporter: {
      enabled: gasReport,
      //gasPrice: gasPrice,
      //outputFile: "gas-report/gas-report.txt",
      noColors: false,
      currency: "USD",
      coinmarketcap: COINMARKETCAP_API_KEY,
      //gasPriceApi: ETHERSCAN_API_KEY, // Comment out for price 
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
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
        mining: {
          auto: true,
          //interval: 3000,
          // mempool: {
          //   order: "fifo"
          // }
        }
      },
      sepolia: {
        url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
      },
      goerli: {
        url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
      },
      amoy: {
        url: `https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}`,
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
      },
      mumbai: {
        url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
      },
      polygon: {
        url: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
      },
      mainnet: {
        chainId: 1,
        url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        ledgerAccounts: useLedger?[
          ledgerAddress
        ]:[],
      },
    }
  };
} else {
  module.exports = {
    defaultNetwork: "hardhat",
    solidity: {
      version:"0.8.28",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    },
    gasReporter: {
      enabled: gasReport,
      //gasPrice: gasPrice,
      //outputFile: "gas-report/gas-report.txt",
      noColors: false,
      currency: "USD",
      coinmarketcap: COINMARKETCAP_API_KEY,
      //gasPriceApi: ETHERSCAN_API_KEY, // Comment out for price
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
      sepolia: {
        url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
        //accounts: [PRIVATE_KEY],
      },
      goerli: {
        url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
        //accounts: [PRIVATE_KEY],
      },
      mumbai: {
        url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
        //accounts: [PRIVATE_KEY],
      },
      amoy: {
        url: `https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}`,
        //accounts: [PRIVATE_KEY],
      },
      polygon: {
        url: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
        //accounts: [PRIVATE_KEY],
      },
      // Uncomment when you need to deploy and there is a PRIVATE_KEY in .env file
      mainnet: {
        chainId: 1,
        url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        //accounts: [PRIVATE_KEY],
        /*
        accounts: {
          mnemonic: MNEMONIC,
          path: "m/44'/60'/0'/0",
          initialIndex: 0,
          count: 20,
          passphrase: PASSPHRASE + ""
        },
        */
      },
    }
  };
}
