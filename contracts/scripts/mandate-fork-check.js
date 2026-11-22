// Fork check for AgentMandate against the REAL Agent ID contract on BSC mainnet.
// Finds a real Agent ID holder from recent mint events, impersonates it as the operator, and runs:
// a paid in-scope purchase, a prompt-injected transfer that gets blocked, and auto-revocation.
//   FORK_BSC=1 BSC_RPC_URL=https://bsc-rpc.publicnode.com npx hardhat run scripts/mandate-fork-check.js
const { ethers, network } = require("hardhat");
const { BSC } = require("./lib/config");

const E = (x) => ethers.parseEther(x);

async function findHolder(agentId) {
  const latest = await ethers.provider.getBlockNumber();
  const topic = ethers.id("Transfer(address,address,uint256)");
  for (let to = latest; to > latest - 400_000; to -= 40_000) {
    const logs = await ethers.provider.getLogs({
      address: BSC.agentId,
      topics: [topic, ethers.zeroPadValue("0x", 32)],
      fromBlock: to - 39_999,
      toBlock: to,
    });
    for (const l of logs.reverse()) {
      const holder = ethers.getAddress("0x" + l.topics[2].slice(26));
      const code = await ethers.provider.getCode(holder);
      if (code === "0x" && (await agentId.balanceOf(holder)) > 0n) return holder;
    }
  }
  throw new Error("no Agent ID holder found in recent blocks");
}

async function main() {
  if (network.name !== "hardhat" || !process.env.FORK_BSC) throw new Error("run with FORK_BSC=1 on the hardhat network");
  await network.provider.send("hardhat_mine", ["0x1"]); // reads at the fork block itself are not supported
  const [principal] = await ethers.getSigners();
  // fresh addresses: well-known test accounts may carry code (EIP-7702 sweepers) on mainnet
  const seller = { address: ethers.Wallet.createRandom().address };
  const attacker = { address: ethers.Wallet.createRandom().address };
  const agentId = new ethers.Contract(BSC.agentId, ["function balanceOf(address) view returns (uint256)"], ethers.provider);
  const holder = await findHolder(agentId);
  console.log("real Agent ID holder:", holder);

  const mandate = await ethers.deployContract("AgentMandate", [BSC.agentId]);
  const desk = await ethers.deployContract("DemoResearchDesk", [E("0.001"), seller.address]);
  console.log("AgentMandate deploy gas:", (await mandate.deploymentTransaction().wait()).gasUsed.toString());
  console.log("principal is not an Agent ID holder:", !(await mandate.isAgent(principal.address)));

  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const terms = { perTxCap: E("0.002"), dailyCap: E("0.005"), coSignAbove: E("0.0015"), expiry: now + 7 * 86400, maxViolations: 2 };
  const perms = [{ target: await desk.getAddress(), selector: desk.interface.getFunction("buyNote").selector }];
  const rc = await (await mandate.connect(principal).create(holder, terms, perms, { value: E("0.01") })).wait();
  console.log("create gas:", rc.gasUsed.toString());

  await network.provider.request({ method: "hardhat_impersonateAccount", params: [holder] });
  await network.provider.send("hardhat_setBalance", [holder, "0x16345785D8A0000"]); // 0.1 BNB for gas
  const agent = await ethers.getSigner(holder);

  const buy = desk.interface.encodeFunctionData("buyNote", [42]);
  const r1 = await (await mandate.connect(agent).execute(1, await desk.getAddress(), E("0.001"), buy)).wait();
  console.log("in-scope purchase gas:", r1.gasUsed.toString(), "notes sold:", (await desk.sold()).toString());

  const before = await ethers.provider.getBalance(attacker.address);
  const r2 = await (await mandate.connect(agent).execute(1, attacker.address, E("0.002"), "0x")).wait();
  const blocked = r2.logs.map((l) => { try { return mandate.interface.parseLog(l); } catch { return null; } }).find((x) => x?.name === "Blocked");
  console.log("injected transfer -> Blocked, reason", blocked.args.reason.toString(), "gas:", r2.gasUsed.toString());
  await (await mandate.connect(agent).execute(1, attacker.address, E("0.002"), "0x")).wait();
  console.log("attacker received:", (await ethers.provider.getBalance(attacker.address)) - before, "wei");
  console.log("mandate active after 2 violations:", await mandate.isActive(1));
  const rec = await mandate.recordOf(holder);
  console.log(`record: executed=${rec.executed} blocked=${rec.blocked} autoRevoked=${rec.autoRevoked}`);
  if ((await desk.sold()) !== 1n || (await mandate.isActive(1)) || rec.autoRevoked !== 1n) throw new Error("unexpected state");
  console.log("MANDATE FORK CHECK PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
