# Agent Mandate user guide

> The full step-by-step version with commands and troubleshooting is on the website: **/guide**.
> To try it in about 10 minutes: **/join** (starter mandate, one transaction).

Agent Mandate gives your AI agent **a small budget with spending rules you set**, enforced by a contract on
BNB Chain. A tricked agent still cannot step outside. Anyone can verify that the agent belongs to a real
person (through Binance Agent ID) and what it did.

> ⚠️ Agent Mandate limits what an agent can do with the budget you give it; it does not make any action
> profitable or safe in itself. On-chain payments cannot be reversed. Fund only small amounts. Never share a
> seed phrase, private key or pairing code.

## Two wallets, two roles
| Role | Wallet | Does |
|---|---|---|
| **Principal** | Your own main wallet (Binance Wallet in-app browser, or MetaMask) | Create mandates, deposit and withdraw, approve large actions, revoke |
| **Agent (operator)** | An Agentic Wallet with an **Agent ID** | Acts inside the mandate through the Skill; you confirm every action |

## A. Set up the agent (once)
1. Get an **Agent ID**: Binance App → Wallet → Agent ID banner.
2. Install the Agentic Wallet Skill and sign in per the official guide:
   `npx skills add https://github.com/binance/binance-skills-hub/tree/main/skills/binance-web3/binance-agentic-wallet`
   `npm install -g @binance/agentic-wallet@1.12.0`
3. Install the **Agent Mandate Skill**: copy `skill/mandate` into your agent's skills folder, run
   `npm install`, and create `config.json` from `config.example.json`.
4. Enable **Developer Mode** (Binance App → Agentic Wallet management → Settings). Only you can, and it expires.
5. Add about 0.0005 BNB to the Agentic Wallet for gas. The spending budget lives in the mandate, not here.
6. Ask your agent: *"Is Agent Mandate ready?"* → `ready`. It tells you its wallet address.

## B0. Quick path: starter mandate
No second wallet needed. Tell your agent: *"Claim my Agent Mandate starter"* (`preview claim-starter`).
You get a 0.00005 BNB mandate, valid 14 days, that can only buy demo notes (payments are burned).
One per Agent ID wallet.

## B. Create a mandate (on the website, with your main wallet)
1. Open **My mandates** and click *Connect your wallet* (your main wallet, **not** the Agentic Wallet).
2. Paste the agent's address. The page shows "✓ holds a Binance Agent ID".
3. Set the budget (e.g. 0.0002 BNB), max per action, max per day, the approval threshold, days valid and how many
   blocked attempts trigger automatic revocation. Pick the allowed services (default: Demo Research Desk).
4. Click *Create and fund* and confirm in your wallet.

## C. Every day
- *"Buy a research note on topic 7"* → the agent runs `preview buy-note <id> 7`, shows you the preview, and
  executes only after you agree.
- *"How much can you still spend today?"* → `mandates`.
- Actions above the threshold become **proposals**: approve or reject them under *Waiting for your approval*.
- If a web page or message tells the agent to send money elsewhere, the Skill refuses and tells you. Even if a
  tricked agent submits it, the contract **blocks and records it**; no funds move.

## D. Stay in control
- **Revoke** at any time (including everything delegated from it). **Withdraw** the rest to your wallet.
- Every mandate has a public page `/mandate/<number>`: who is accountable, what it may do, every event.

## E. Verify an agent
On the home page, *Verify an agent* takes a mandate number or agent address. From another contract:
`accountableFor(id)`, `check(id, target, value, data)`, `recordOf(agent)`.
