# Agent Mandate: specification (v0.1, 2026-11-22)

An on-chain **Know Your Agent** layer for Agentic Wallets on BNB Chain. It implements layers 3–5 of the
KYA framework published by Binance Global Policy (mandate and least privilege, delegation, revocation and
audit). Binance Agent ID provides layers 1–2 (one non-transferable identity per Binance user).

## Problem

An AI agent with a wallet can be talked into sending money (prompt or memory injection; see
docs/RESEARCH-GAP.vi.md). Per-transaction confirmation helps, but people approve on autopilot, and
outsiders cannot see what an agent is allowed to do or who answers for it.

## Roles

| Role | Who | Can |
|---|---|---|
| Principal | The human's own wallet (not the agent's) | Create and fund a mandate, withdraw, revoke, approve large actions |
| Operator | An Agentic Wallet holding an **Agent ID** | Act inside the mandate; delegate a narrower mandate to a sub-agent; resign |
| Sub-operator | Another Agent ID wallet | Act inside the sub-mandate (which also counts against every ancestor) |
| Anyone | dApps, merchants, other agents | Verify: who is accountable, is this action within scope, what has the agent done |

## Mandate

- `operator`, `principal`, `parent` (0 for a root), `expiry`
- `perTxCap`, `dailyCap` (BNB, per UTC day), `coSignAbove` (actions above need the principal's approval)
- `maxViolations` (out-of-scope attempts before automatic revocation; 0 = never)
- Permissions: allowed `(target, selector)` pairs. Selector `0x00000000` = plain BNB transfer (empty data);
  `0xffffffff` = any function of that target.
- Funds: BNB held by the **root** mandate; sub-mandates spend the root's balance.

## Rules (enforced by the contract, the agent cannot override them)

1. An action needs: operator still holds an Agent ID, mandate and every ancestor active (not revoked, not
   expired), target allowed at **every** level, value within `perTxCap` and the remaining `dailyCap` at
   **every** level, and enough root balance.
2. Out-of-scope attempts **do not revert**: they are recorded as `Blocked(reason)` and count as violations.
   Reaching `maxViolations` revokes the mandate automatically (a hijacked agent shuts itself off).
3. Value above `coSignAbove` (but otherwise in scope) becomes a **proposal**; it executes only when the
   principal approves. The agent recommends, the human authorises.
4. Delegation can only **narrow** scope: caps ≤ parent, expiry ≤ parent, permissions ⊆ parent, depth ≤ 3.
5. Only the principal can withdraw, always to itself. The contract never pulls funds; no token approvals.
6. Revocation: the principal revokes any mandate in its tree; a parent operator revokes its children; an
   operator may resign. Revoking a mandate disables its whole subtree.
7. The contract cannot call itself; calls are protected against re-entrancy.

## Verification for third parties

- `accountableFor(id)` → principal, operator, root, operator holds Agent ID, active
- `check(id, target, value, data)` → would this action pass, and if not, why
- `recordOf(operator)` → actions executed, value spent, attempts blocked, mandates revoked for violations
- Events form a public audit trail: `MandateCreated`, `Delegated`, `Executed`, `Blocked`, `Proposed`,
  `Approved`, `Revoked`.

## Starter faucet (onboarding)

`StarterFaucet` is a principal that creates a small sponsored mandate (0.00005 BNB, 14 days, demo notes
only, auto-revoke after 3 violations) for any Agent ID wallet that calls `claim()`, once per wallet. The
budget cannot be withdrawn by the agent and can only buy demo notes whose payments are burned. Its
immutable sponsor may withdraw the unused pool, revoke starters and reclaim their unused budget.

## Admin

AgentMandate: none. No owner, no fee, no pause, no upgrade. Funds belong to principals and can only be
withdrawn by them. StarterFaucet: the sponsor powers listed above.

## Out of scope for v0.1

BEP-20 token spending (planned via a dedicated `payToken` with token caps), ERC-8004 publishing of the
compliance record.
