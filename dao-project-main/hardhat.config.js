require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      // See its defaults
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/lHsk508FvXfDO0wO8DGxkumcQR_L_NhA",
      accounts: ["bc69d8627c66be7a4065aa83286fab496680e228bed15de10472ccc52d349725"] // Replace with your wallet's private key
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
};