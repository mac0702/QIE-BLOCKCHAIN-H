import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  let signer;
  
  // For localhost/hardhat networks, use unlocked accounts from the local node
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Get the unlocked accounts from the local node
    const accounts = await provider.send("eth_accounts", []);
    if (!accounts || accounts.length === 0) {
      throw new Error(
        "No accounts available from local node. Make sure hardhat node is running."
      );
    }
    
    // Use getSigner with index to get an unlocked signer from the node
    signer = await provider.getSigner(0);
    const address = await signer.getAddress();
    console.log("Deploying with local test account:", address);
  } else {
    // For testnets/mainnets, use private key
    if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === "") {
      throw new Error("PRIVATE_KEY not set in .env");
    }
    
    const url =
      (hre.network && hre.network.config && hre.network.config.url) ||
      process.env.SEPOLIA_RPC_URL;
    const provider = new ethers.JsonRpcProvider(url);
    
    const key = process.env.PRIVATE_KEY.startsWith("0x")
      ? process.env.PRIVATE_KEY
      : `0x${process.env.PRIVATE_KEY}`;
    signer = new ethers.Wallet(key, provider);
    console.log("Deploying with account:", await signer.getAddress());
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
