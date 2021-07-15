require('dotenv').config({ path: `./.env.${process.env.NODE_ENV || "ropsten"}`});
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {

    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 7545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
    },

    ropsten: {
      provider: () => new HDWalletProvider (
        process.env.MNEMONIC,
        process.env.ROPSTEN_URL),
      network_id: 3,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  plugins: ["solidity-coverage"],

  // Set default mocha options here, use special reporters etc.
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions : { 
      excludeContracts: ['Migrations'] 
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.6", 
    }
  },

  db: {
    enabled: false
  }
};
