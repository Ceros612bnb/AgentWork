"use client";

import { useEffect, useState } from "react";
import {
  addrUrl,
  fetchAllMandates,
  fetchAudit,
  fetchMandate,
  fmtBnb,
  fmtCoSign,
  fmtDate,
  publicClient,
  MANDATE,
  mandateAbi,
  selectorLabel,
  short,
  type Activity,
  type MandateView,
} from "@/lib/chain";
import { ActivityRow, Who } from "@/lib/ui";

export default function MandatePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [m, setM] = useState<MandateView | null>(null);
  const [root, setRoot] = useState<MandateView | null>(null);
  const [holds, setHolds] = useState<boolean | null>(null);
  const [children, setChildren] = useState<MandateView[]>([]);
  const [audit, setAudit] = useState<Activity[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) return;
    (async () => {
      const x = await fetchMandate(id);
      if (x.operator === "0x0000000000000000000000000000000000000000") throw new Error("unknown mandate");
      setM(x);
      const [acc, all] = await Promise.all([
        publicClient.readContract({ address: MANDATE, abi: mandateAbi, functionName: "isAgent", args: [x.operator] }),
        fetchAllMandates(),
      ]);
      setHolds(acc);
      setChildren(all.filter((c) => c.parent === id));
      let r = x;
      while (r.parent !== 0) r = all.find((c) => c.id === r.parent) ?? (await fetchMandate(r.parent));
      setRoot(r);
      setAudit(await fetchAudit(id, x.createdBlock).catch(() => []));
    })().catch((e) => setErr(String(e?.shortMessage || e?.message || e).includes("unknown") ? "No mandate with this number." : String(e?.shortMessage || e?.message || e)));
  }, [id]);

  if (!Number.isInteger(id) || id < 1) return <div className="panel">Not a mandate number.</div>;
  const status = !m ? null : m.active ? "active" : m.revoked ? "revoked" : "expired";

  return (
    <>
      <div className="profile-head">
        <div>
          <div className="eyebrow">Mandate</div>
          <h1>#{id} {m && m.parent !== 0 && <span className="muted" style={{ fontSize: 16 }}>delegated from <a className="link" href={`/mandate/${m.parent}`}>#{m.parent}</a></span>}</h1>
        </div>
        {status && <span className={`pill big s-${status}`}>{status}</span>}
      </div>
      {err && <div className="panel">{err}</div>}
      {m && (
        <>
          <section className="panel acc">
            <h3>Who is accountable</h3>
            <div className="kv2">
              <div><span className="muted">Principal (human wallet)</span><b className="break">{m.principal}</b></div>
              <div><span className="muted">Agent (operator)</span><b><Who address={m.operator} /></b>
                <span className={holds ? "up" : "down"}>{holds === null ? "…" : holds ? "✓ holds a Binance Agent ID" : "✗ no Agent ID"}</span></div>
              <div><span className="muted">Root mandate (holds the budget)</span><b><a className="link" href={`/mandate/${root?.id ?? id}`}>#{root?.id ?? id}</a></b></div>
            </div>
          </section>

          <div className="kv">
            <div className="stat"><b>{fmtBnb(m.remainingToday)}</b><span>can still spend today</span></div>
            <div className="stat"><b>{fmtBnb(m.perTxCap)}</b><span>max per action</span></div>
            <div className="stat"><b>{fmtBnb(m.dailyCap)}</b><span>max per day</span></div>
            <div className="stat"><b>{fmtCoSign(m.coSignAbove)}</b><span>human approval above</span></div>
            <div className="stat"><b>{root ? fmtBnb(root.balance) : "…"}</b><span>budget held</span></div>
            <div className="stat"><b className={m.violations ? "down" : ""}>{m.violations}{m.maxViolations ? ` / ${m.maxViolations}` : ""}</b><span>violations (auto-revoke limit)</span></div>
          </div>
          <p className="muted">Valid until {fmtDate(m.expiry)}. Limits apply at this level and every level above it.</p>

          <section>
            <h2 className="section-title">What it <em>may</em> do</h2>
            <div className="panel scroll">
              <table>
                <thead><tr><th>Contract</th><th>Function</th></tr></thead>
                <tbody>
                  {m.permissions.map((p) => (
                    <tr key={p.target + p.selector}>
                      <td className="break">{addrUrl(p.target) ? <a className="link" href={addrUrl(p.target)!}>{p.target}</a> : p.target}</td>
                      <td>{selectorLabel(p.selector, p.target)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ marginBottom: 0 }}>Everything else is blocked and recorded.</p>
            </div>
          </section>

          {children.length > 0 && (
            <section>
              <h2 className="section-title">Delegated to <em>sub-agents</em></h2>
              <div className="panel scroll">
                <table>
                  <thead><tr><th>Mandate</th><th>Sub-agent</th><th className="r">Per day</th><th>Status</th></tr></thead>
                  <tbody>
                    {children.map((c) => (
                      <tr key={c.id}>
                        <td><a className="link" href={`/mandate/${c.id}`}>#{c.id}</a></td>
                        <td><Who address={c.operator} /></td>
                        <td className="r">{fmtBnb(c.dailyCap)}</td>
                        <td><span className={`pill s-${c.active ? "active" : c.revoked ? "revoked" : "expired"}`}>{c.active ? "active" : c.revoked ? "revoked" : "expired"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title">Audit <em>trail</em></h2>
            <div className="panel">
              {audit === null ? <p className="muted">Loading events…</p> : audit.length === 0 ? <p className="muted">No events found.</p> : (
                <div className="alist">{audit.map((a, i) => <ActivityRow key={a.tx + a.kind + i} a={a} showMandate={false} />)}</div>
              )}
              <p className="muted" style={{ marginBottom: 0 }}>Every action, blocked attempt, approval request and revocation, straight from contract events. Principal {short(m.principal)}.</p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
