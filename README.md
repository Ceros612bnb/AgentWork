# Agent Mandate

**Know Your Agent, enforced on-chain.** Give your AI agent a budget, not your wallet.

A human (the *principal*) gives an AI agent (an Agentic Wallet holding a **Binance Agent ID**) a small
budget and a **mandate**: which contracts and functions it may call, how much per action and per day,
until when, and above which amount the human must approve. The contract enforces it, so an agent tricked
by a malicious prompt still cannot step outside. Anyone can check who is accountable for an agent, what
it may do, and everything it did or tried to do.

Built for the Binance Wallet × BNB Chain *Agent ID Hackathon* (submission deadline 2026-12-09 08:00 UTC).

## The problem

- Binance Global Policy's *Know Your Agent* paper names **unattributable action** as the core risk of
  agentic finance: KYC says who the customer is, not whether an instruction came from the customer, an
  authorised agent, a compromised agent or a sub-agent beyond its mandate. It proposes five layers
  (identity, accountable principal, mandate, delegation, revocation and audit), as policy only.
- A 2026 survey of about 80 sources finds **no deployed protocol** that proves which human authorised which
  agent to take which action, and calls for scope that only narrows at every delegation step
  (Otsuka et al., arXiv:2604.23280).
- Agents with wallets get tricked: Princeton researchers made a Web3 agent transfer funds through injected
  memories, and prompt-based defences proved weak (arXiv:2503.16248).

See [docs/RESEARCH-GAP.vi.md](docs/RESEARCH-GAP.vi.md) for the full survey and sources.

## The answer

| KYA layer (Binance Global Policy) | Agent Mandate |
|---|---|
| 1–2 Agent identity, accountable principal | The agent must hold a Binance Agent ID (one per user, non-transferable); the principal is a separate human wallet |
| 3 Mandate, least privilege | Allowed `(contract, function)` pairs, cap per action and per day, expiry; actions above a threshold become proposals the human approves |
| 4 Delegation | Sub-mandates may only narrow (caps, threshold, expiry, permissions); spending counts against every level; depth ≤ 3 |
| 5 Revocation, audit | The principal revokes a whole branch; out-of-scope attempts are recorded (`Blocked`) and auto-revoke a hijacked agent |
| Third parties | `accountableFor(id)`, `check(id, target, value, data)`, `recordOf(agent)` |

**Agent ID is load-bearing:** it is what makes every agent traceable to exactly one real person.
Specification: [docs/MANDATE-SPEC.md](docs/MANDATE-SPEC.md).

## Contracts (BNB Chain)

| Contract | Notes |
|---|---|
| `AgentMandate` | Mandates, enforcement, proposals, delegation, revocation, public record |
| `DemoResearchDesk` | Demo pay-per-use service: a note costs 0.00001 BNB and the payment is burned |
| `StarterFaucet` | One-transaction onboarding: any Agent ID wallet claims a small sponsored starter mandate (demo notes only), once |
| Agent ID (external) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` |

### Admin permissions (disclosure)

`AgentMandate` and `DemoResearchDesk`: **none.** No owner, no pause, no upgrade, no fee. Budgets belong to
principals and can only be withdrawn by them, always to themselves. No token approvals.

`StarterFaucet`: its immutable `sponsor` (the deployer) can withdraw the unused pool, revoke a starter
mandate and pull its unused budget back into the pool. It cannot touch anyone else's funds.

## Repository layout

```
contracts/   Hardhat: AgentMandate.sol, DemoResearchDesk.sol, mocks, tests, scripts
skill/       mandate Skill (SKILL.md + scripts/am.mjs) for Agentic Wallet users
web/         Next.js: live activity, verify an agent, mandate audit pages, principal console
docs/        Specification, research survey, user guides (VI/EN)
```

## Quick start

```bash
cd contracts && npm install && npx hardhat test        # 15 tests
FORK_BSC=1 BSC_RPC_URL=https://bsc-rpc.publicnode.com npm run fork-check   # real Agent ID on a BSC fork
cp .env.example .env                                    # DEPLOYER_PRIVATE_KEY (fresh wallet), ETHERSCAN_API_KEY
STARTER_POOL=0.002 npm run deploy:bsc                   # AgentMandate, DemoResearchDesk, StarterFaucet (+40 starters)
```

Local: `npx hardhat node`, then `npm run seed:local` (six scenarios, writes `web/.env.local`).
Skill: `cd skill/mandate && npm install && cp config.example.json config.json && node scripts/am.mjs ready`.
Web: `cd web && npm install && npm run dev`. Users start at `/join` and follow `/guide` (English and Vietnamese).

## Hackathon safety checklist

- [x] No web QR / pairing-code login for Agentic Wallets; the principal uses their own wallet, agents act only through the official `baw` CLI
- [x] The Skill never bypasses user confirmation (check → preview → user yes → execute) and refuses out-of-scope actions
- [x] No token approvals; only the principal can withdraw, to itself
- [x] Contracts open source, admin permissions disclosed (none)
- [x] No "Binance"/"BNB" in project, token or domain names
- [x] No collection of seed phrases, private keys, API secrets or pairing codes
- [x] No promised returns; risk warning on every page
- [x] No "look up wallets by name" feature: lookups are by mandate number or address only

## License

MIT
