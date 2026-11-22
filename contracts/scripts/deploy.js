// Deploy AgentMandate and the demo service. On bsc it uses the real Agent ID contract; elsewhere a mock.
//   npx hardhat run scripts/deploy.js --network bsc
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const { BSC, DEMO } = require("./lib/config");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network ${network.name}, deployer ${deployer.address}`);
  console.log(`Balance ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB`);

  let agentId = BSC.agentId;
  if (network.name !== "bsc") {
    const mock = await ethers.deployContract("MockAgentID");
    agentId = await mock.getAddress();
    console.log(`MockAgentID ${agentId} (not mainnet: holders are set with setHolder)`);
  }

  const mandate = await ethers.deployContract("AgentMandate", [agentId]);
  const mrc = await mandate.deploymentTransaction().wait();
  const desk = await ethers.deployContract("DemoResearchDesk", [ethers.parseEther(DEMO.price), DEMO.beneficiary]);
  await desk.waitForDeployment();

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    agentId,
    agentMandate: await mandate.getAddress(),
    demoResearchDesk: await desk.getAddress(),
    demoPrice: DEMO.price,
    deployBlock: mrc.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  if (network.name === "bsc") {
    console.log(`\nVerify:\n  npx hardhat verify --network bsc ${out.agentMandate} ${agentId}`);
    console.log(`  npx hardhat verify --network bsc ${out.demoResearchDesk} ${ethers.parseEther(DEMO.price)} ${DEMO.beneficiary}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
