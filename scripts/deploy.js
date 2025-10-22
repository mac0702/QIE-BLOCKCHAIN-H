import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  // Create a provider connected to the target network
  const url =
    (hre.network && hre.network.config && hre.network.config.url) ||
    "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(url);

  // Fast preflight: try a single RPC call with a short timeout to detect unreachable RPCs
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    // ethers v6 JsonRpcProvider doesn't accept AbortSignal directly for send; we'll use a quick RPC request
    await provider.send("eth_chainId", []);
    clearTimeout(timeout);
  } catch (err) {
    throw new Error(
      `RPC connectivity check failed for ${url}: ${
        err.message || err
      }. Start a local node (npx hardhat node) or set a valid RPC URL in .env`
    );
  }

  let signer;
  if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "") {
    const key = process.env.PRIVATE_KEY.startsWith("0x")
      ? process.env.PRIVATE_KEY
      : `0x${process.env.PRIVATE_KEY}`;
    signer = new ethers.Wallet(key, provider);
    console.log("Deploying with account:", await signer.getAddress());
  } else {
    // Fallback: use the first account from the local JSON-RPC (if available)
    const accounts = await provider.send("eth_accounts", []);
    if (accounts && accounts.length > 0) {
      signer = provider.getSigner(accounts[0]);
      console.log("Deploying with RPC account:", accounts[0]);
    } else {
      throw new Error(
        "No signer available: set PRIVATE_KEY in .env or run a local node with unlocked accounts"
      );
    }
  }

  // NOTE: The original script referenced `MyContract` which isn't present in this
  // project. We'll deploy a MockERC20 locally if no stablecoin address is provided,
  // then deploy `GlobeFi` using the token address.
  let tokenAddress = process.env.STABLECOIN_ADDRESS;

  if (
    !tokenAddress ||
    hre.network.name === "hardhat" ||
    hre.network.name === "localhost"
  ) {
    console.log("Deploying MockERC20 locally...");
    const mockArtifact = await hre.artifacts.readArtifact("MockERC20");
    const MockFactory = new ethers.ContractFactory(
      mockArtifact.abi,
      mockArtifact.bytecode,
      signer
    );
    const parseUnits =
      ethers.parseUnits || (ethers.utils && ethers.utils.parseUnits);
    const mock = await MockFactory.deploy(
      "MockUSD",
      "mUSD",
      parseUnits("1000000", 18)
    );
    if (mock.waitForDeployment) {
      await mock.waitForDeployment();
    } else if (mock.deployed) {
      await mock.deployed();
    }
    tokenAddress = mock.target || mock.address;
    console.log("MockERC20 deployed to:", tokenAddress);
  }

  console.log("Using token address:", tokenAddress);

  const globeArtifact = await hre.artifacts.readArtifact("GlobeFi");
  const GlobeFactory = new ethers.ContractFactory(
    globeArtifact.abi,
    globeArtifact.bytecode,
    signer
  );
  const globe = await GlobeFactory.deploy(tokenAddress);
  if (globe.waitForDeployment) {
    await globe.waitForDeployment();
  } else if (globe.deployed) {
    await globe.deployed();
  }
  console.log("GlobeFi deployed to:", globe.target || globe.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
