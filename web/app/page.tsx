"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import {
  MANDATE,
  addrUrl,
  agentsFrom,
  configured,
  fetchAllMandates,
  fetchRecentActivity,
  fetchRecords,
  fmtBnb,
  type Activity,
  type AgentRow,
  type MandateView,
} from "@/lib/chain";
import { ActivityRow, REPO, Who } from "@/lib/ui";

export default function Home() {
  const [mandates, setMandates] = useState<MandateView[] | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qErr, setQErr] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const ms = await fetchAllMandates();
      const recs = await fetchRecords(ms.map((x) => x.operator));
      setMandates(ms);
      setAgents(agentsFrom(ms, recs));
      setActivity(await fetchRecentActivity(12).catch(() => []));
    })().catch((e) => setErr(String(e?.shortMessage || e?.message || e)));
  }, []);

  const executed = agents.reduce((s, a) => s + a.executed, 0);
  const blocked = agents.reduce((s, a) => s + a.blocked, 0);
  const active = mandates?.filter((x) => x.active).length ?? 0;

  function verify(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim().replace(/^#/, "");
    if (/^\d+$/.test(v)) location.href = `/mandate/${v}`;
    else if (isAddress(v)) location.href = `/agent/${v}`;
    else setQErr("Enter a mandate number (e.g. 12) or an agent wallet address (0x…).");
  }

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">Know Your Agent, enforced on-chain</div>
          <h1>
            Give your AI agent a budget, <em>not your wallet</em>
          </h1>
          <p className="lead">
            Set what your agent may pay for, how much per action and per day, and until when. The contract enforces it,
            so an agent tricked by a malicious prompt still cannot step outside. Anyone can verify the real person
            accountable for it through Binance Agent ID.
          </p>
          <div className="badges">
            <div className="badge"><div><strong>{blocked}</strong><span>out-of-scope attempts stopped</span></div></div>
            <div className="badge"><div><strong>1 person</strong><span>behind every agent (Agent ID)</span></div></div>
            <div className="badge"><div><strong>0 admin</strong><span>keys, fees or upgrades</span></div></div>
          </div>
          <div className="cta">
            <a className="btn btn-primary lg" href="/principal">Create a mandate</a>
            <a className="btn btn-ghost lg" href="#verify">Verify an agent</a>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="tabs"><span className="tab on">Live activity</span></div>
            <span className="muted">last ~9 hours</span>
          </div>
          {!configured && <p className="muted">Set NEXT_PUBLIC_MANDATE_ADDRESS in .env.local.</p>}
          {err && <p className="muted">Could not read the chain: {err}</p>}
          {configured && !err && activity.length === 0 && <p className="muted">{mandates ? "No activity in this window." : "Loading…"}</p>}
          <div className="alist">
            {activity.map((a) => <ActivityRow key={a.tx + a.kind + a.id} a={a} />)}
          </div>
        </div>
      </div>

      <section className="stats">
        <div className="stat"><b>{active}</b><span>active mandates</span></div>
        <div className="stat"><b>{agents.length}</b><span>Agent ID agents</span></div>
        <div className="stat"><b>{executed}</b><span>actions executed in scope</span></div>
        <div className="stat"><b className="down">{blocked}</b><span>attempts blocked</span></div>
      </section>

      <section>
        <h2 className="section-title">The problem nobody <em>enforces</em> yet</h2>
        <div className="steps three">
          <div className="step">
            <h4>&quot;Which agent acted, on whose authority?&quot;</h4>
            <p>
              Binance Global Policy&apos;s <i>Know Your Agent</i> paper names unattributable action as the core risk of
              agentic finance and proposes mandates, delegation, revocation and audit. It is a policy framework, with no
              implementation.
            </p>
          </div>
          <div className="step">
            <h4>No deployed protocol proves the chain</h4>
            <p>
              A 2026 survey of ~80 sources (arXiv:2604.23280) finds no deployed protocol that proves which human
              authorised which agent to take which action, and calls for scope that only narrows at each delegation.
            </p>
          </div>
          <div className="step">
            <h4>Agents with wallets get tricked</h4>
            <p>
              Princeton researchers made a Web3 agent send funds through injected memories (arXiv:2503.16248), and
              prompt-based defences proved weak. Reported incidents include an agent wallet drained by a hidden
              instruction in a post.
            </p>
          </div>
        </div>
      </section>

      <section id="verify">
        <h2 className="section-title">Verify an <em>agent</em></h2>
        <form className="panel verify" onSubmit={verify}>
          <input value={q} onChange={(e) => { setQ(e.target.value); setQErr(null); }} placeholder="Mandate number or agent wallet address (0x…)" aria-label="Mandate number or agent address" />
          <button className="btn btn-primary" type="submit">Verify</button>
          {qErr && <p className="muted" style={{ gridColumn: "1 / -1", margin: 0 }}>{qErr}</p>}
        </form>
        <p className="muted">
          You get the accountable principal, whether the agent holds an Agent ID, exactly what it may do, and every action
          it took or attempted. Lookups are by mandate number or address only.
        </p>
      </section>

      <section>
        <h2 className="section-title">Agents and their <em>record</em></h2>
        <div className="panel scroll">
          {agents.length === 0 ? (
            <p className="muted">{mandates ? "No agents yet." : "Loading…"}</p>
          ) : (
            <table>
              <thead>
                <tr><th>Agent (Agent ID wallet)</th><th className="r">Active mandates</th><th className="r">Executed</th><th className="r">Spent</th><th className="r">Blocked</th><th className="r">Auto-revoked</th></tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.operator}>
                    <td><Who address={a.operator} /></td>
                    <td className="r">{a.active}/{a.mandates}</td>
                    <td className="r up">{a.executed}</td>
                    <td className="r">{fmtBnb(a.spent)}</td>
                    <td className={`r ${a.blocked ? "down" : ""}`}>{a.blocked}</td>
                    <td className="r">{a.autoRevoked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="section-title">The five KYA layers, <em>on-chain</em></h2>
        <div className="panel scroll">
          <table className="compare">
            <thead><tr><th>Layer (Binance Global Policy)</th><th>Agent Mandate</th></tr></thead>
            <tbody>
              <tr><td>1–2 · Agent identity, accountable principal</td><td>The agent must hold a Binance Agent ID (one per user, non-transferable); the principal is a separate human wallet</td></tr>
              <tr><td>3 · Mandate and least privilege</td><td>Allowed contracts and functions, cap per action and per day, expiry; actions above a threshold wait for the human</td></tr>
              <tr><td>4 · Delegation</td><td>Agents can delegate to sub-agents, but scope only narrows and spending counts against every level</td></tr>
              <tr><td>5 · Revocation and audit</td><td>One-click revoke of a whole branch; out-of-scope attempts are recorded and auto-revoke a hijacked agent</td></tr>
              <tr><td>Third parties</td><td><code>accountableFor</code>, <code>check</code> and <code>recordOf</code> let any dApp or agent verify before trusting</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="how">
        <h2 className="section-title">How it <em>works</em></h2>
        <div className="steps">
          <div className="step"><div className="n">1</div><h4>Your agent gets an Agent ID</h4><p>In the Binance App. It proves one real, accountable person stands behind the agent.</p></div>
          <div className="step"><div className="n">2</div><h4>You create a mandate</h4><p>From your own wallet on this site: a small budget, allowed services, caps, expiry, approval threshold.</p></div>
          <div className="step"><div className="n">3</div><h4>Your agent acts inside it</h4><p>With the open-source Skill, every action is checked, previewed and confirmed. Out of scope never moves funds.</p></div>
          <div className="step"><div className="n">4</div><h4>Stay in control</h4><p>Approve large actions, revoke anytime, withdraw the rest. Your agent&apos;s record is public.</p></div>
        </div>
        <div className="cta" style={{ marginTop: 20 }}>
          <a className="btn btn-primary" href={`${REPO}/blob/main/docs/GUIDE.en.md`} target="_blank" rel="noopener noreferrer">Read the guide</a>
          <a className="btn btn-ghost" href={`${REPO}/blob/main/docs/GUIDE.vi.md`} target="_blank" rel="noopener noreferrer">Hướng dẫn tiếng Việt</a>
        </div>
      </section>

      <p className="muted break" style={{ marginTop: 32 }}>
        Contract: {addrUrl(MANDATE) ? <a className="link" href={`${addrUrl(MANDATE)}#code`}>{MANDATE}</a> : MANDATE}
      </p>
    </>
  );
}
