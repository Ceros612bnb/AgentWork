// Verify deployed contracts through the Etherscan API v2 (one key for all chains; BscScan's v1 API is retired).
// Uses the exact standard-JSON compiler input from Hardhat's build-info, so the bytecode matches.
//   node scripts/verify-v2.js            (reads deployments/bsc.json and ETHERSCAN_API_KEY from .env)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { AbiCoder } = require("ethers");

const API = "https://api.etherscan.io/v2/api";
const KEY = process.env.ETHERSCAN_API_KEY;
const net = process.argv[2] || "bsc";
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${net}.json`), "utf8"));
const chainId = dep.chainId;

function buildInfoFor(source, name) {
  const dir = path.join(__dirname, "..", "artifacts", "build-info");
  for (const f of fs.readdirSync(dir)) {
    const bi = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (bi.output?.contracts?.[source]?.[name]) return bi;
  }
  throw new Error(`no build-info for ${source}:${name}`);
}

function encodeArgs(bi, source, name, args) {
  const abi = bi.output.contracts[source][name].abi;
  const ctor = abi.find((x) => x.type === "constructor");
  if (!ctor) return "";
  return AbiCoder.defaultAbiCoder().encode(ctor.inputs.map((i) => i.type), args).slice(2);
}

async function post(params) {
  const body = new URLSearchParams({ ...params, apikey: KEY, chainid: String(chainId) });
  const r = await fetch(`${API}?chainid=${chainId}`, { method: "POST", body });
  return r.json();
}

async function get(params) {
  const q = new URLSearchParams({ ...params, apikey: KEY, chainid: String(chainId) });
  const r = await fetch(`${API}?${q}`);
  return r.json();
}

async function verify(label, address, source, name, args) {
  const bi = buildInfoFor(source, name);
  const res = await post({
    module: "contract",
    action: "verifysourcecode",
    contractaddress: address,
    sourceCode: JSON.stringify(bi.input),
    codeformat: "solidity-standard-json-input",
    contractname: `${source}:${name}`,
    compilerversion: `v${bi.solcLongVersion}`,
    constructorArguements: encodeArgs(bi, source, name, args),
  });
  if (res.status !== "1") {
    console.log(`${label}: ${res.result}`);
    return;
  }
  const guid = res.result;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await get({ module: "contract", action: "checkverifystatus", guid });
    if (!/Pending/i.test(s.result)) {
      console.log(`${label}: ${s.result}`);
      return;
    }
  }
  console.log(`${label}: still pending (guid ${guid})`);
}

async function main() {
  if (!KEY) throw new Error("ETHERSCAN_API_KEY missing in .env");
  const price = 10000000000000n; // 0.00001 BNB
  await verify("AgentMandate", dep.agentMandate, "contracts/AgentMandate.sol", "AgentMandate", [dep.agentId]);
  await verify("DemoResearchDesk", dep.demoResearchDesk, "contracts/DemoResearchDesk.sol", "DemoResearchDesk", [
    price,
    "0x000000000000000000000000000000000000dEaD",
  ]);
  await verify("StarterFaucet", dep.starterFaucet, "contracts/StarterFaucet.sol", "StarterFaucet", [
    dep.agentMandate,
    dep.agentId,
    dep.demoResearchDesk,
    "0x891daf86",
    dep.sponsor,
  ]);
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
