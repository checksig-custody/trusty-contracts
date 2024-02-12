require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

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
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.13",
  gasReporter: {
    enabled: true,
    //outputFile: "gas-report.txt",
    noColors: false,
    currency: "EUR",
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "ETH"
  }
};
