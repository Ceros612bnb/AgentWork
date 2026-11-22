import type { Activity } from "@/lib/chain";
import { agentUrl, fmtBnb, mandateUrl, short, txUrl } from "@/lib/chain";

export const REPO = "https://github.com/Ceros612bnb/agent-mandate";

/** Our own mark: a shield with a check inside. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--yellow)" />
      <path d="M16 5 L25 8.5 V15 C25 21 21 25 16 27 C11 25 7 21 7 15 V8.5 Z" fill="none" stroke="var(--on-yellow)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11.5 16 L14.8 19.3 L20.8 12.8" fill="none" stroke="var(--on-yellow)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Deterministic avatar from an address: two colours from its hex. */
export function Avatar({ address, size = 28 }: { address: string; size?: number }) {
  const h1 = parseInt(address.slice(2, 8), 16) % 360;
  const h2 = parseInt(address.slice(-6), 16) % 360;
  return (
    <span
      className="dot"
      aria-hidden="true"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h1} 70% 55%), hsl(${h2} 70% 45%))` }}
    />
  );
}

export function Who({ address, href }: { address: string; href?: string }) {
  return (
    <a className="who" href={href ?? agentUrl(address)}>
      <Avatar address={address} size={22} />
      {short(address)}
    </a>
  );
}

const KIND_LABEL: Record<Activity["kind"], string> = {
  executed: "Executed",
  blocked: "Blocked",
  proposed: "Needs approval",
  revoked: "Revoked",
  created: "Created",
  delegated: "Delegated",
};

export function KindPill({ kind }: { kind: Activity["kind"] }) {
  return <span className={`pill k-${kind}`}>{KIND_LABEL[kind]}</span>;
}

export function ActivityRow({ a, showMandate = true }: { a: Activity; showMandate?: boolean }) {
  const url = txUrl(a.tx);
  return (
    <div className="arow">
      <KindPill kind={a.kind} />
      <span className="adetail">
        {showMandate && <a className="link" href={mandateUrl(a.id)}>#{a.id}</a>} {a.detail}
        {a.target && a.kind !== "created" ? <span className="muted"> · to {short(a.target)}</span> : null}
      </span>
      <span className={`aval num ${a.kind === "blocked" ? "down" : a.kind === "executed" ? "up" : ""}`}>
        {a.value !== null ? fmtBnb(a.value) : ""}
      </span>
      {url ? <a className="muted" href={url} target="_blank" rel="noopener noreferrer">tx ↗</a> : <span className="muted">#{a.block.toString()}</span>}
    </div>
  );
}
