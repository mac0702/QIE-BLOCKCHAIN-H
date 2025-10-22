import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem"; // Standard toolbox (viem variant)
import "@nomicfoundation/hardhat-ignition"; // optional ignition plugin if installed
import * as dotenv from "dotenv";

dotenv.config();
// Read and normalize environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
let PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!SEPOLIA_RPC_URL) {
  throw new Error("Missing SEPOLIA_RPC_URL in .env");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing PRIVATE_KEY in .env");
}

// Ensure private key has 0x prefix which Hardhat expects
if (!PRIVATE_KEY.startsWith("0x")) {
  PRIVATE_KEY = `0x${PRIVATE_KEY}`;
}

const config = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337,
      type: "edr-simulated",
    }, // Local development network
    sepolia: {
      url: SEPOLIA_RPC_URL, // Read from .env
      accounts: [PRIVATE_KEY], // normalized private key
      type: "http", // Required by Hardhat v2.17+
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
} as unknown as HardhatUserConfig;

export default config;
