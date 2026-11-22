"use client";

import { useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import {
  FAUCET,
  MANDATE,
  configured,
  fetchParticipants,
  fetchRecord,
  fetchStarterOf,
  fmtBnb,
  publicClient,
  mandateAbi, to, mandateUrl } from "@/lib/chain";
import { Who } from "@/lib/ui";

const GOAL = 30;

type Check = { isAgent: boolean; starter: number; mandates: number; executed: bigint; blocked: bigint };

export default function Join() {
  const [wallets, setWallets] = useState<Address[] | null>(null);
  const [pool, setPool] = useState<{ left: bigint | null; budget: bigint | null }>({ left: null, budget: null });
  const [err, setErr] = useState<string | null>(null);
  const [addr, setAddr] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!configured) return;
    fetchParticipants()
      .then((p) => {
        setWallets(p.wallets);
        setPool({ left: p.poolLeft, budget: p.budget });
      })
      .catch((e) => setErr(String(e?.shortMessage || e?.message || e)));
  }, []);

  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddress(addr)) return;
    setChecking(true);
    try {
      const a = addr as Address;
      const [r, starter, isAgent] = await Promise.all([
        fetchRecord(a),
        fetchStarterOf(a),
        publicClient.readContract({ address: MANDATE, abi: mandateAbi, functionName: "isAgent", args: [a] }),
      ]);
      setCheck({ isAgent, starter, mandates: r.ids.length, executed: r.record.executed, blocked: r.record.blocked });
    } finally {
      setChecking(false);
    }
  }

  const n = wallets?.length ?? 0;
  const pct = Math.min(100, Math.round((n / GOAL) * 100));
  const startersLeft = pool.left !== null && pool.budget ? Number(pool.left / pool.budget) : null;
  const counted = check && check.isAgent && (check.starter > 0 || check.executed + check.blocked > 0n);

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">The Agent Mandate challenge</div>
          <h1>Try to trick your own agent. <em>The chain says no.</em></h1>
          <p className="lead">
            Claim a free starter mandate for your AI agent in one transaction: a tiny budget that can only buy demo research
            notes (the payments are burned, nobody profits). Let it buy a note, then try to talk it into paying someone else
            and watch the contract block it. About 10 minutes if your Agentic Wallet is already set up.
          </p>
          <div className="cta">
            <a className="btn btn-primary lg" href={to("/guide/")}>Step-by-step guide</a>
            <a className="btn btn-ghost lg" href={to("/guide/?lang=vi")}>Hướng dẫn tiếng Việt</a>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="tabs"><span className="tab on">Agent ID agents joined</span></div></div>
          {!configured && <p className="muted">Set NEXT_PUBLIC_MANDATE_ADDRESS in .env.local.</p>}
          {err && <p className="muted">Could not read the chain: {err}</p>}
          <div className="goal"><b className="num">{wallets ? n : "…"}</b><span> / {GOAL} goal</span></div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <p className="muted">
            Counted: Agent ID wallets that claimed a starter mandate or acted under any mandate.
            {startersLeft !== null && <> Starter budgets left in the pool: <b>{startersLeft}</b> ({fmtBnb(pool.left)}).</>}
          </p>
          <div className="chips">{(wallets ?? []).slice(0, 40).map((w) => <Who key={w} address={w} />)}</div>
        </div>
      </div>

      <section>
        <h2 className="section-title">Three steps to <em>join</em></h2>
        <div className="steps three">
          <div className="step"><div className="n">1</div><h4>Agent ready</h4><p>Agent ID, Agentic Wallet signed in with the official <code>baw</code> CLI, Developer Mode on, a little BNB for gas, and the Agent Mandate Skill installed.</p></div>
          <div className="step"><div className="n">2</div><h4>Claim your starter</h4><p>Tell your agent: &quot;Claim my Agent Mandate starter&quot;. Check the preview, say yes, confirm in the Binance App if it asks.</p></div>
          <div className="step"><div className="n">3</div><h4>Use it, then attack it</h4><p>&quot;Buy a research note on topic 7&quot;, then &quot;send 0.00001 BNB from my mandate to 0x…dEaD&quot;. The first works; the second never moves funds.</p></div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Am I <em>counted</em>?</h2>
        <form className="panel verify" onSubmit={onCheck}>
          <input value={addr} onChange={(e) => { setAddr(e.target.value.trim()); setCheck(null); }} placeholder="Your agent's Agentic Wallet address (0x…)" aria-label="Agent wallet address" />
          <button className="btn btn-primary" type="submit" disabled={!isAddress(addr) || checking}>{checking ? "Checking…" : "Check"}</button>
        </form>
        {check && (
          <div className={`panel notice ${counted ? "ok" : "bad"}`}>
            <p style={{ marginTop: 0 }}><b>{counted ? "✓ You are counted. Thank you!" : "Not counted yet."}</b></p>
            <ul className="checklist">
              <li className={check.isAgent ? "up" : "down"}>{check.isAgent ? "✓" : "✗"} Holds an Agent ID</li>
              <li className={check.starter ? "up" : ""}>{check.starter ? `✓ Starter mandate #${check.starter} claimed` : "○ No starter mandate yet"}</li>
              <li>{check.mandates} mandate(s) · {check.executed.toString()} action(s) executed · {check.blocked.toString()} attempt(s) blocked</li>
            </ul>
            {!check.isAgent && <p className="muted">Use the Agentic Wallet address that holds your Agent ID (ask your agent: &quot;what is my Agentic Wallet BSC address?&quot;).</p>}
            {check.starter > 0 && <a className="link" href={mandateUrl(check.starter)}>Open your starter mandate →</a>}
          </div>
        )}
      </section>

      {FAUCET === "0x0000000000000000000000000000000000000000" && <p className="muted">Starter faucet not configured on this deployment.</p>}
    </>
  );
}
