"use client";

import { useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import { fetchMandate, fetchRecord, fmtBnb, fmtDate, type MandateView, mandateUrl } from "@/lib/chain";
import { Avatar } from "@/lib/ui";

type Rec = { executed: bigint; blocked: bigint; autoRevoked: number; spent: bigint };

export default function AgentPage() {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setAddress(q.get("address") ?? "");
  }, []);
  if (address === null) return <div className="panel">Loading…</div>;
  return <AgentDetail key={address} address={address as Address} />;
}

function AgentDetail({ address }: { address: Address }) {
  const [rec, setRec] = useState<Rec | null>(null);
  const [isAgent, setIsAgent] = useState<boolean | null>(null);
  const [mandates, setMandates] = useState<MandateView[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAddress(address)) return;
    (async () => {
      const r = await fetchRecord(address);
      setRec(r.record);
      setIsAgent(r.isAgent);
      setMandates((await Promise.all(r.ids.map(fetchMandate))).reverse());
    })().catch((e) => setErr(String(e?.shortMessage || e?.message || e)));
  }, [address]);

  if (!isAddress(address)) return <div className="panel">Not an address.</div>;
  return (
    <>
      <div className="profile-head">
        <Avatar address={address} size={48} />
        <div>
          <div className="eyebrow">Agent</div>
          <h1 className="break">{address}</h1>
          <span className={isAgent ? "up" : "down"}>{isAgent === null ? "…" : isAgent ? "✓ holds a Binance Agent ID: one accountable person" : "✗ no Agent ID"}</span>
        </div>
      </div>
      {err && <div className="panel">Could not read the chain: {err}</div>}
      {rec && (
        <div className="kv">
          <div className="stat"><b className="up">{rec.executed.toString()}</b><span>actions executed in scope</span></div>
          <div className="stat"><b>{fmtBnb(rec.spent)}</b><span>spent through mandates</span></div>
          <div className="stat"><b className={rec.blocked ? "down" : ""}>{rec.blocked.toString()}</b><span>attempts blocked</span></div>
          <div className="stat"><b className={rec.autoRevoked ? "down" : ""}>{rec.autoRevoked}</b><span>mandates auto-revoked</span></div>
        </div>
      )}
      <section>
        <h2 className="section-title">Mandates it <em>acts under</em></h2>
        <div className="panel scroll">
          {mandates.length === 0 ? <p className="muted">{rec ? "No mandates." : "Loading…"}</p> : (
            <table>
              <thead><tr><th>Mandate</th><th>Principal</th><th className="r">Per action</th><th className="r">Per day</th><th>Valid until</th><th>Status</th></tr></thead>
              <tbody>
                {mandates.map((m) => {
                  const s = m.active ? "active" : m.revoked ? "revoked" : "expired";
                  return (
                    <tr key={m.id}>
                      <td><a className="link" href={mandateUrl(m.id)}>#{m.id}</a>{m.parent ? <span className="muted"> ← #{m.parent}</span> : null}</td>
                      <td className="break">{m.principal}</td>
                      <td className="r">{fmtBnb(m.perTxCap)}</td>
                      <td className="r">{fmtBnb(m.dailyCap)}</td>
                      <td>{fmtDate(m.expiry)}</td>
                      <td><span className={`pill s-${s}`}>{s}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
