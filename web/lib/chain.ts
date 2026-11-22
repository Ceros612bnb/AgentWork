import {
  createPublicClient,
  defineChain,
  formatEther,
  http,
  parseAbi,
  parseAbiItem,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

export const MANDATE = (process.env.NEXT_PUBLIC_MANDATE_ADDRESS || zeroAddress) as Address;
export const DESK = (process.env.NEXT_PUBLIC_DESK_ADDRESS || zeroAddress) as Address;
const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://bsc-rpc.publicnode.com";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 56);
export const EXPLORER = CHAIN_ID === 56 ? "https://bscscan.com" : null;
export const configured = MANDATE !== zeroAddress;

export const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 56 ? "BNB Smart Chain" : `Local chain ${CHAIN_ID}`,
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: CHAIN_ID === 56 ? { default: { name: "BscScan", url: "https://bscscan.com" } } : undefined,
});

export const publicClient = createPublicClient({ chain, transport: http(RPC, { batch: true }) });

export const mandateAbi = parseAbi([
  "struct Terms { uint128 perTxCap; uint128 dailyCap; uint128 coSignAbove; uint64 expiry; uint32 maxViolations; }",
  "struct Permission { address target; bytes4 selector; }",
  "struct Mandate { address principal; address operator; uint256 parent; Terms terms; uint8 depth; bool revoked; uint32 violations; uint64 day; uint128 spentToday; uint256 balance; uint64 createdBlock; }",
  "struct Record { uint64 executed; uint64 blocked; uint32 autoRevoked; uint256 spent; }",
  "struct Proposal { uint256 mandateId; address target; uint256 value; bytes data; bool done; }",
  "function isAgent(address a) view returns (bool)",
  "function mandateCount() view returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function getMandate(uint256 id) view returns (Mandate)",
  "function getProposal(uint256 id) view returns (Proposal)",
  "function permissionsOf(uint256 id) view returns (Permission[])",
  "function isActive(uint256 id) view returns (bool)",
  "function remainingToday(uint256 id) view returns (uint256)",
  "function recordOf(address operator) view returns (Record)",
  "function mandatesOf(address operator) view returns (uint256[])",
  "function mandatesByPrincipal(address principal) view returns (uint256[])",
  "function create(address operator, Terms terms, Permission[] perms) payable returns (uint256)",
  "function deposit(uint256 id) payable",
  "function withdraw(uint256 id, uint256 amount)",
  "function revoke(uint256 id)",
  "function approve(uint256 proposalId)",
  "function reject(uint256 proposalId)",
]);

export const deskAbi = parseAbi(["function price() view returns (uint256)", "function sold() view returns (uint256)"]);

export const events = {
  created: parseAbiItem("event MandateCreated(uint256 indexed id, address indexed principal, address indexed operator, uint256 deposit)"),
  delegated: parseAbiItem("event Delegated(uint256 indexed id, uint256 indexed parent, address indexed operator)"),
  executed: parseAbiItem("event Executed(uint256 indexed id, address indexed operator, address indexed target, bytes4 selector, uint256 value)"),
  blocked: parseAbiItem("event Blocked(uint256 indexed id, address indexed operator, address indexed target, bytes4 selector, uint256 value, uint8 reason)"),
  proposed: parseAbiItem("event Proposed(uint256 indexed proposalId, uint256 indexed id, address indexed target, uint256 value)"),
  revoked: parseAbiItem("event Revoked(uint256 indexed id, address indexed by, bool automatic)"),
};

export const REASON = ["—", "No Agent ID", "Inactive", "Not allowed", "Over per-action cap", "Over daily cap", "Insufficient funds"];
export const MAX128 = (1n << 128n) - 1n;
export const TRANSFER = "0x00000000";
export const ANY = "0xffffffff";

const m = { address: MANDATE, abi: mandateAbi } as const;

// ------------------------------------------------------------------ mandates

export type MandateView = {
  id: number;
  principal: Address;
  operator: Address;
  parent: number;
  depth: number;
  perTxCap: bigint;
  dailyCap: bigint;
  coSignAbove: bigint;
  expiry: number;
  maxViolations: number;
  violations: number;
  revoked: boolean;
  active: boolean;
  balance: bigint; // root only
  remainingToday: bigint;
  createdBlock: bigint;
  permissions: { target: Address; selector: Hex }[];
};

export async function fetchMandate(id: number): Promise<MandateView> {
  const I = BigInt(id);
  const [x, active, left, perms] = await Promise.all([
    publicClient.readContract({ ...m, functionName: "getMandate", args: [I] }),
    publicClient.readContract({ ...m, functionName: "isActive", args: [I] }),
    publicClient.readContract({ ...m, functionName: "remainingToday", args: [I] }),
    publicClient.readContract({ ...m, functionName: "permissionsOf", args: [I] }),
  ]);
  return {
    id,
    principal: x.principal,
    operator: x.operator,
    parent: Number(x.parent),
    depth: x.depth,
    perTxCap: x.terms.perTxCap,
    dailyCap: x.terms.dailyCap,
    coSignAbove: x.terms.coSignAbove,
    expiry: Number(x.terms.expiry),
    maxViolations: x.terms.maxViolations,
    violations: x.violations,
    revoked: x.revoked,
    active,
    balance: x.balance,
    remainingToday: left,
    createdBlock: x.createdBlock,
    permissions: perms.map((p) => ({ target: p.target, selector: p.selector })),
  };
}

export async function fetchAllMandates(limit = 200): Promise<MandateView[]> {
  const n = Number(await publicClient.readContract({ ...m, functionName: "mandateCount" }));
  const ids: number[] = [];
  for (let i = n; i >= 1 && ids.length < limit; i--) ids.push(i);
  return Promise.all(ids.map(fetchMandate));
}

export type AgentRow = { operator: Address; executed: number; blocked: number; autoRevoked: number; spent: bigint; mandates: number; active: number };

export function agentsFrom(mandates: MandateView[], records: Map<string, { executed: bigint; blocked: bigint; autoRevoked: number; spent: bigint }>): AgentRow[] {
  const by = new Map<string, AgentRow>();
  for (const x of mandates) {
    const k = x.operator.toLowerCase();
    const r = records.get(k);
    const row = by.get(k) ?? {
      operator: x.operator,
      executed: Number(r?.executed ?? 0n),
      blocked: Number(r?.blocked ?? 0n),
      autoRevoked: r?.autoRevoked ?? 0,
      spent: r?.spent ?? 0n,
      mandates: 0,
      active: 0,
    };
    row.mandates += 1;
    if (x.active) row.active += 1;
    by.set(k, row);
  }
  return [...by.values()].sort((a, b) => b.executed - a.executed || a.blocked - b.blocked);
}

export async function fetchRecords(operators: Address[]) {
  const uniq = [...new Set(operators.map((o) => o.toLowerCase()))] as Address[];
  const recs = await Promise.all(uniq.map((o) => publicClient.readContract({ ...m, functionName: "recordOf", args: [o] })));
  return new Map(uniq.map((o, i) => [o, recs[i]]));
}

export async function fetchRecord(operator: Address) {
  const [r, isAgent, ids] = await Promise.all([
    publicClient.readContract({ ...m, functionName: "recordOf", args: [operator] }),
    publicClient.readContract({ ...m, functionName: "isAgent", args: [operator] }),
    publicClient.readContract({ ...m, functionName: "mandatesOf", args: [operator] }),
  ]);
  return { record: r, isAgent, ids: ids.map(Number) };
}

export type ProposalView = { id: number; mandateId: number; target: Address; value: bigint; done: boolean };

export async function fetchProposals(mandateIds: Set<number>): Promise<ProposalView[]> {
  const n = Number(await publicClient.readContract({ ...m, functionName: "proposalCount" }));
  const all = await Promise.all(
    Array.from({ length: n }, (_, i) => publicClient.readContract({ ...m, functionName: "getProposal", args: [BigInt(i + 1)] }))
  );
  return all
    .map((p, i) => ({ id: i + 1, mandateId: Number(p.mandateId), target: p.target, value: p.value, done: p.done }))
    .filter((p) => mandateIds.has(p.mandateId));
}

// ------------------------------------------------------------------ activity (logs)
// Public BSC RPCs cap eth_getLogs at 50,000 blocks, so logs are read in chunks.

export type Activity = {
  kind: "executed" | "blocked" | "proposed" | "revoked" | "created" | "delegated";
  id: number;
  actor: Address | null;
  target: Address | null;
  value: bigint | null;
  detail: string;
  block: bigint;
  tx: Hex;
};

const CHUNK = 45_000n;

async function logsInRange(from: bigint, to: bigint, args?: { id: bigint }) {
  const ev = Object.values(events);
  const out: Awaited<ReturnType<typeof publicClient.getLogs>> = [];
  for (let a = from; a <= to; a += CHUNK) {
    const b = a + CHUNK - 1n > to ? to : a + CHUNK - 1n;
    const logs = await publicClient.getLogs({ address: MANDATE, events: ev, fromBlock: a, toBlock: b, args: args as never });
    out.push(...(logs as typeof out));
  }
  return out;
}

function toActivity(l: { eventName?: string; args?: unknown; blockNumber: bigint | null; transactionHash: Hex | null }): Activity | null {
  const a = (l.args ?? {}) as Record<string, never>;
  const base = { block: l.blockNumber ?? 0n, tx: (l.transactionHash ?? "0x") as Hex };
  switch (l.eventName) {
    case "Executed":
      return { kind: "executed", id: Number(a.id), actor: a.operator, target: a.target, value: a.value, detail: selectorLabel(String(a.selector), String(a.target)), ...base };
    case "Blocked":
      return { kind: "blocked", id: Number(a.id), actor: a.operator, target: a.target, value: a.value, detail: `${REASON[Number(a.reason)] ?? "blocked"}: ${selectorLabel(String(a.selector), String(a.target))}`, ...base };
    case "Proposed":
      return { kind: "proposed", id: Number(a.id), actor: null, target: a.target, value: a.value, detail: `proposal #${a.proposalId} awaits the human`, ...base };
    case "Revoked":
      return { kind: "revoked", id: Number(a.id), actor: a.by, target: null, value: null, detail: a.automatic ? "auto-revoked after violations" : "revoked", ...base };
    case "MandateCreated":
      return { kind: "created", id: Number(a.id), actor: a.principal, target: a.operator, value: a.deposit, detail: "mandate created", ...base };
    case "Delegated":
      return { kind: "delegated", id: Number(a.id), actor: a.operator, target: null, value: null, detail: `delegated from #${a.parent}`, ...base };
    default:
      return null;
  }
}

/** Recent activity across all mandates (last ~45k blocks, about 9 hours on BSC). */
export async function fetchRecentActivity(limit = 25): Promise<Activity[]> {
  const latest = await publicClient.getBlockNumber();
  const from = latest > CHUNK ? latest - CHUNK + 1n : 0n;
  const logs = await logsInRange(from, latest);
  return logs.map(toActivity).filter((x): x is Activity => x !== null).reverse().slice(0, limit);
}

/** The full audit trail of one mandate, from its creation block (at most ~30 chunks). */
export async function fetchAudit(id: number, createdBlock: bigint): Promise<Activity[]> {
  const latest = await publicClient.getBlockNumber();
  const maxSpan = CHUNK * 30n;
  const from = latest - createdBlock > maxSpan ? latest - maxSpan : createdBlock;
  const logs = await logsInRange(from, latest);
  return logs
    .map(toActivity)
    .filter((x): x is Activity => x !== null && x.id === id)
    .reverse();
}

// ------------------------------------------------------------------ formatting

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export function fmtBnb(wei: bigint | null | undefined) {
  if (wei === null || wei === undefined) return "—";
  const s = formatEther(wei);
  return `${s.length > 10 ? Number(s).toPrecision(4) : s} BNB`;
}
export const fmtCoSign = (v: bigint) => (v >= MAX128 ? "never" : fmtBnb(v));
export function fmtDate(t: number) {
  return new Date(t * 1000).toUTCString().slice(5, 22) + " UTC";
}
export function selectorLabel(sel: string, target: string) {
  if (sel === TRANSFER) return "plain BNB transfer";
  if (sel === ANY) return "any function";
  if (target.toLowerCase() === DESK.toLowerCase() && sel === "0x891daf86") return "buyNote(uint256)";
  return sel;
}
export const txUrl = (tx: string) => (EXPLORER ? `${EXPLORER}/tx/${tx}` : null);
export const addrUrl = (a: string) => (EXPLORER ? `${EXPLORER}/address/${a}` : null);
