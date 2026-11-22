// Local demo data on a running `npx hardhat node`: deploys everything with a mock Agent ID, then plays
// realistic scenarios (purchases, a sub-agent, a hijack attempt that gets blocked and auto-revoked,
// a co-signed purchase, a revoked mandate) and writes web/.env.local.
//   npx hardhat run scripts/seed-local.js --network localhost
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const { DEMO } = require("./lib/config");

const E = (x) => ethers.parseEther(x);
const ANY = "0xffffffff";

async function main() {
  const s = await ethers.getSigners();
  const agents = s.slice(1, 6);
  const principals = s.slice(6, 11);
  const attacker = s[11];

  const agentId = await ethers.deployContract("MockAgentID");
  for (const a of agents) await (await agentId.setHolder(a.address, true)).wait();
  const mandate = await ethers.deployContract("AgentMandate", [await agentId.getAddress()]);
  const deployBlock = (await mandate.deploymentTransaction().wait()).blockNumber;
  const desk = await ethers.deployContract("DemoResearchDesk", [E(DEMO.price), DEMO.beneficiary]);
  const deskAddr = await desk.getAddress();
  const buy = (t) => desk.interface.encodeFunctionData("buyNote", [t]);
  const perms = [{ target: deskAddr, selector: desk.interface.getFunction("buyNote").selector }];
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const terms = (o = {}) => ({
    perTxCap: E("0.00002"),
    dailyCap: E("0.0001"),
    coSignAbove: E("0.00002"),
    expiry: now + 30 * 86400,
    maxViolations: 3,
    ...o,
  });
  const create = async (p, a, t, value = "0.0005") =>
    (await mandate.connect(p).create(a.address, t, perms, { value: E(value) })).wait();
  const exec = async (a, id, target, value, data) => (await mandate.connect(a).execute(id, target, value, data)).wait();

  // 1: a well-behaved research agent
  await create(principals[0], agents[0], terms());
  for (const t of [1, 2, 3]) await exec(agents[0], 1, deskAddr, E(DEMO.price), buy(t));
  // 2: it delegates a narrower budget to a sub-agent, which buys once
  await (await mandate.connect(agents[0]).delegate(1, agents[1].address, terms({ dailyCap: E("0.00003"), maxViolations: 2 }), perms)).wait();
  await exec(agents[1], 2, deskAddr, E(DEMO.price), buy(4));
  // 3: a hijacked agent tries to send funds to an attacker three times -> blocked, then auto-revoked
  await create(principals[1], agents[2], terms());
  await exec(agents[2], 3, deskAddr, E(DEMO.price), buy(5));
  for (let i = 0; i < 3; i++) await exec(agents[2], 3, attacker.address, E("0.0004"), "0x");
  // 4: every purchase needs the human's approval (co-sign threshold below the price)
  await create(principals[2], agents[3], terms({ coSignAbove: E("0.000005") }));
  await exec(agents[3], 4, deskAddr, E(DEMO.price), buy(6));
  await (await mandate.connect(principals[2]).approve(1)).wait();
  // 5: a mandate the principal revoked
  await create(principals[3], agents[4], terms({ maxViolations: 0 }), "0.0002");
  await exec(agents[4], 5, deskAddr, E(DEMO.price), buy(7));
  await (await mandate.connect(principals[3]).revoke(5)).wait();
  // 6: an ANY-function mandate on the desk, still active, no activity yet
  await (await mandate.connect(principals[4]).create(agents[4].address, terms(), [{ target: deskAddr, selector: ANY }], { value: E("0.0003") })).wait();

  const out = {
    network: "localhost",
    chainId: 31337,
    agentId: await agentId.getAddress(),
    agentMandate: await mandate.getAddress(),
    demoResearchDesk: deskAddr,
    deployBlock,
    principals: principals.map((p) => p.address),
    agents: agents.map((a) => a.address),
    attacker: attacker.address,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "localhost.json"), JSON.stringify(out, null, 2));
  for (const a of agents) {
    const r = await mandate.recordOf(a.address);
    console.log(`${a.address} executed ${r.executed} blocked ${r.blocked} autoRevoked ${r.autoRevoked}`);
  }
  const env = [
    `NEXT_PUBLIC_MANDATE_ADDRESS=${out.agentMandate}`,
    `NEXT_PUBLIC_DESK_ADDRESS=${deskAddr}`,
    "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545",
    "NEXT_PUBLIC_CHAIN_ID=31337",
  ].join("\n");
  fs.writeFileSync(path.join(__dirname, "..", "..", "web", ".env.local"), env + "\n");
  console.log("Wrote web/.env.local");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
