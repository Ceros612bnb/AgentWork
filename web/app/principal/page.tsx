"use client";

import { useEffect, useState } from "react";
import { isAddress, parseEther, type Address, type Hex } from "viem";
import {
  ANY,
  DESK,
  MANDATE,
  MAX128,
  TRANSFER,
  configured,
  fetchMandate,
  fetchProposals,
  fmtBnb,
  fmtCoSign,
  fmtDate,
  mandateAbi,
  publicClient,
  short,
  txUrl,
  type MandateView,
  type ProposalView,
} from "@/lib/chain";
import { connect, send } from "@/lib/wallet";

type Perm = { target: Address; selector: Hex };
const BUY_NOTE = "0x891daf86" as Hex;

function parsePerms(text: string): Perm[] | string {
  const out: Perm[] = [];
  for (const raw of text.split(/\n|,/).map((s) => s.trim()).filter(Boolean)) {
    const [t, s] = raw.split(":");
    if (!isAddress(t)) return `Not an address: ${t}`;
    let sel: Hex;
    if (!s || s === "any") sel = ANY as Hex;
    else if (s === "transfer") sel = TRANSFER as Hex;
    else if (/^0x[0-9a-fA-F]{8}$/.test(s)) sel = s as Hex;
    else return `Bad function selector: ${s} (use any, transfer or 0x12345678)`;
    out.push({ target: t as Address, selector: sel });
  }
  return out;
}

export default function Principal() {
  const [account, setAccount] = useState<Address | null>(null);
  const [mine, setMine] = useState<MandateView[]>([]);
  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; tx?: string } | null>(null);

  // create form
  const [agent, setAgent] = useState("");
  const [budget, setBudget] = useState("0.0002");
  const [perTx, setPerTx] = useState("0.00002");
  const [daily, setDaily] = useState("0.0001");
  const [approval, setApproval] = useState("0.00002");
  const [never, setNever] = useState(false);
  const [days, setDays] = useState("14");
  const [maxV, setMaxV] = useState("3");
  const [useDesk, setUseDesk] = useState(true);
  const [custom, setCustom] = useState("");
  const [agentOk, setAgentOk] = useState<boolean | null>(null);

  async function refresh(a: Address) {
    const ids = await publicClient.readContract({ address: MANDATE, abi: mandateAbi, functionName: "mandatesByPrincipal", args: [a] });
    const ms = (await Promise.all(ids.map((i) => fetchMandate(Number(i))))).reverse();
    setMine(ms);
    setProposals((await fetchProposals(new Set(ms.map((m) => m.id)))).filter((p) => !p.done));
  }

  useEffect(() => {
    if (!isAddress(agent)) return setAgentOk(null);
    publicClient
      .readContract({ address: MANDATE, abi: mandateAbi, functionName: "isAgent", args: [agent as Address] })
      .then(setAgentOk)
      .catch(() => setAgentOk(null));
  }, [agent]);

  async function run(label: string, fn: () => Promise<Hex>) {
    setBusy(label);
    setMsg(null);
    try {
      const tx = await fn();
      setMsg({ ok: true, text: `${label}: confirmed.`, tx });
      if (account) await refresh(account);
    } catch (e) {
      const err = e as { shortMessage?: string; message?: string };
      setMsg({ ok: false, text: `${label} failed: ${err.shortMessage || err.message}` });
    } finally {
      setBusy(null);
    }
  }

  async function onConnect() {
    try {
      const a = await connect();
      setAccount(a);
      await refresh(a);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    const perms = parsePerms(custom);
    if (typeof perms === "string") return setMsg({ ok: false, text: perms });
    if (useDesk && DESK !== "0x0000000000000000000000000000000000000000") perms.unshift({ target: DESK, selector: BUY_NOTE });
    if (perms.length === 0) return setMsg({ ok: false, text: "Add at least one permission." });
    if (agent.toLowerCase() === account.toLowerCase()) return setMsg({ ok: false, text: "The agent must be a different wallet from yours." });
    try {
      const now = (await publicClient.getBlock()).timestamp;
      const terms = {
        perTxCap: parseEther(perTx),
        dailyCap: parseEther(daily),
        coSignAbove: never ? MAX128 : parseEther(approval),
        expiry: now + BigInt(Math.max(1, Number(days))) * 86400n,
        maxViolations: Number(maxV),
      };
      await run("Create mandate", () => send(account, "create", [agent as Address, terms, perms], parseEther(budget)));
    } catch (err) {
      setMsg({ ok: false, text: `Check the numbers: ${(err as Error).message}` });
    }
  }

  return (
    <>
      <div className="eyebrow">Principal console</div>
      <h1 className="section-title" style={{ fontSize: 36, marginTop: 4 }}>Your agents&apos; <em>mandates</em></h1>
      <p className="muted" style={{ fontSize: 15, maxWidth: 760 }}>
        Use your own wallet here (a browser extension or your wallet app&apos;s built-in browser), not the agent&apos;s
        Agentic Wallet. Every action below is a normal transaction you confirm in your wallet. Only you can withdraw, and
        always to this wallet.
      </p>

      {!configured && <div className="panel">Set NEXT_PUBLIC_MANDATE_ADDRESS in .env.local.</div>}
      {msg && (
        <div className={`panel notice ${msg.ok ? "ok" : "bad"}`}>
          {msg.text} {msg.tx && txUrl(msg.tx) && <a className="link" href={txUrl(msg.tx)!} target="_blank" rel="noopener noreferrer">View transaction ↗</a>}
        </div>
      )}

      {!account ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <button className="btn btn-primary lg" onClick={onConnect}>Connect your wallet</button>
          <p className="muted" style={{ marginBottom: 0 }}>We never ask for a seed phrase, private key or pairing code.</p>
        </div>
      ) : (
        <>
          <p className="muted">Connected as <b>{short(account)}</b></p>

          {proposals.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <h2 className="section-title">Waiting for <em>your approval</em></h2>
              <div className="panel scroll">
                <table>
                  <thead><tr><th>Request</th><th>Mandate</th><th>Pay to</th><th className="r">Amount</th><th></th></tr></thead>
                  <tbody>
                    {proposals.map((p) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td><a className="link" href={`/mandate/${p.mandateId}`}>#{p.mandateId}</a></td>
                        <td className="break">{p.target}{p.target.toLowerCase() === DESK.toLowerCase() ? " (demo desk)" : ""}</td>
                        <td className="r">{fmtBnb(p.value)}</td>
                        <td className="r actions">
                          <button className="btn btn-primary sm" disabled={!!busy} onClick={() => run(`Approve #${p.id}`, () => send(account, "approve", [BigInt(p.id)]))}>Approve</button>
                          <button className="btn btn-ghost sm" disabled={!!busy} onClick={() => run(`Reject #${p.id}`, () => send(account, "reject", [BigInt(p.id)]))}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section style={{ marginTop: 24 }}>
            <h2 className="section-title">Create a <em>mandate</em></h2>
            <form className="panel form" onSubmit={onCreate}>
              <label className="full">
                Agent wallet (its Agentic Wallet address, must hold an Agent ID)
                <input value={agent} onChange={(e) => setAgent(e.target.value.trim())} placeholder="0x…" required />
                {agentOk === true && <span className="up">✓ holds a Binance Agent ID</span>}
                {agentOk === false && <span className="down">✗ this wallet has no Agent ID, so it cannot be an operator</span>}
              </label>
              <label>Budget to deposit (BNB)<input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" /></label>
              <label>Max per action (BNB)<input value={perTx} onChange={(e) => setPerTx(e.target.value)} inputMode="decimal" /></label>
              <label>Max per day (BNB)<input value={daily} onChange={(e) => setDaily(e.target.value)} inputMode="decimal" /></label>
              <label>
                Ask me before paying more than (BNB)
                <input value={approval} onChange={(e) => setApproval(e.target.value)} inputMode="decimal" disabled={never} />
                <span className="check"><input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} /> never ask</span>
              </label>
              <label>Valid for (days)<input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" /></label>
              <label>Auto-revoke after this many blocked attempts (0 = never)<input value={maxV} onChange={(e) => setMaxV(e.target.value)} inputMode="numeric" /></label>
              <div className="full">
                <span className="muted">What the agent may call</span>
                {DESK !== "0x0000000000000000000000000000000000000000" && (
                  <label className="check"><input type="checkbox" checked={useDesk} onChange={(e) => setUseDesk(e.target.checked)} /> Demo Research Desk · buyNote (a 0.00001 BNB note; payment is burned)</label>
                )}
                <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={3}
                  placeholder={"Other permissions, one per line:\n0xContract            (any function)\n0xContract:0x12345678 (one function)   0xAddress:transfer (plain BNB transfer)"} />
              </div>
              <div className="full">
                <button className="btn btn-primary lg" type="submit" disabled={!!busy || agentOk === false}>{busy === "Create mandate" ? "Waiting for your wallet…" : "Create and fund"}</button>
                <p className="muted">Out-of-scope attempts never move funds. Start small: you can deposit more later.</p>
              </div>
            </form>
          </section>

          <section>
            <h2 className="section-title">Your <em>mandates</em></h2>
            <div className="panel scroll">
              {mine.length === 0 ? <p className="muted">None yet.</p> : (
                <table>
                  <thead><tr><th>Mandate</th><th>Agent</th><th className="r">Budget</th><th className="r">Today left</th><th>Approval above</th><th>Until</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {mine.map((m) => {
                      const s = m.active ? "active" : m.revoked ? "revoked" : "expired";
                      return (
                        <tr key={m.id}>
                          <td><a className="link" href={`/mandate/${m.id}`}>#{m.id}</a></td>
                          <td><a className="link" href={`/agent/${m.operator}`}>{short(m.operator)}</a></td>
                          <td className="r">{m.parent === 0 ? fmtBnb(m.balance) : "—"}</td>
                          <td className="r">{fmtBnb(m.remainingToday)}</td>
                          <td>{fmtCoSign(m.coSignAbove)}</td>
                          <td>{fmtDate(m.expiry)}</td>
                          <td><span className={`pill s-${s}`}>{s}</span></td>
                          <td className="r actions">
                            {m.parent === 0 && (
                              <>
                                <button className="btn btn-ghost sm" disabled={!!busy} onClick={() => {
                                  const v = prompt("Deposit how much BNB?", "0.0001");
                                  if (v) run(`Deposit to #${m.id}`, () => send(account, "deposit", [BigInt(m.id)], parseEther(v)));
                                }}>Deposit</button>
                                <button className="btn btn-ghost sm" disabled={!!busy || m.balance === 0n} onClick={() => run(`Withdraw from #${m.id}`, () => send(account, "withdraw", [BigInt(m.id), m.balance]))}>Withdraw all</button>
                              </>
                            )}
                            {m.active && <button className="btn btn-danger sm" disabled={!!busy} onClick={() => run(`Revoke #${m.id}`, () => send(account, "revoke", [BigInt(m.id)]))}>Revoke</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
