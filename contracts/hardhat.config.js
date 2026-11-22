require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const accounts = process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks: {
    // FORK_BSC=1 runs scripts against a fork of BSC mainnet (real Agent ID contract).
    hardhat: process.env.FORK_BSC
      ? { forking: { url: process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org" }, chainId: 56 }
      : {},
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org",
      chainId: 56,
      accounts,
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts,
    },
  },
  etherscan: {
    // Etherscan API v2: one key for every chain, chain chosen by ?chainid= (the old BscScan v1 API is retired).
    apiKey: { bsc: process.env.ETHERSCAN_API_KEY || "", bscTestnet: process.env.ETHERSCAN_API_KEY || "" },
    customChains: [
      { network: "bsc", chainId: 56, urls: { apiURL: "https://api.etherscan.io/v2/api?chainid=56", browserURL: "https://bscscan.com" } },
      { network: "bscTestnet", chainId: 97, urls: { apiURL: "https://api.etherscan.io/v2/api?chainid=97", browserURL: "https://testnet.bscscan.com" } },
    ],
  },
  sourcify: { enabled: false },
};
