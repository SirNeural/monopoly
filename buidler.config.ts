import { BuidlerConfig, usePlugin } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-waffle");
usePlugin("@nomiclabs/buidler-etherscan");
// usePlugin("@nomiclabs/buidler-ganache");
usePlugin("buidler-typechain");
usePlugin("solidity-coverage");

const INFURA_API_KEY = process.env.INFURA_API_KEY!;
const RINKEBY_PRIVATE_KEY = "";
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY!;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY!;

const config: BuidlerConfig = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: "0.6.2",
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [RINKEBY_PRIVATE_KEY]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    coverage: {
      url: 'http://127.0.0.1:8555' // Coverage launches its own ganache-cli client
    }
  },
  etherscan: {
    // The url for the Etherscan API you want to use.
    url: "https://api-goerli.etherscan.io/api",
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY
  },
  typechain: {
    outDir: "typechain",
    target: "ethers"
  }
};

export default config;
