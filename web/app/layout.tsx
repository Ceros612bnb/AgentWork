import type { Metadata } from "next";
import { to } from "@/lib/chain";
import { IBM_Plex_Sans } from "next/font/google";
import { Logo, REPO } from "@/lib/ui";
import "./globals.css";

const font = IBM_Plex_Sans({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Agent Mandate",
  description: "Know Your Agent, enforced on-chain: budgets and mandates for AI agents backed by an Agent ID, on BNB Chain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>
        <header className="top">
          <div className="top-in">
            <a href={to("/")} className="brand">
              <Logo />
              <span>
                Agent<b>Mandate</b>
              </span>
            </a>
            <nav className="nav">
              <a href={to("/join/")}>Join the challenge</a>
              <a href={to("/guide/")}>Guide</a>
              <a href={to("/#verify")}>Verify an agent</a>
              <a href={to("/principal/")}>My mandates</a>
            </nav>
            <span className="spacer" />
            <a className="btn btn-primary sm" href={to("/principal/")}>Create a mandate</a>
          </div>
        </header>
        <div className="riskbar">
          <div>
            <b>Risk warning:</b> Agent Mandate limits what an AI agent can do with a budget you choose; it does not make any
            action profitable or safe in itself, and on-chain payments cannot be reversed. Fund only small amounts.
          </div>
        </div>
        <main>{children}</main>
        <footer>
          <div>
            <span>
              Contracts are open source and have no admin permissions: no owner, fee, pause or upgrade. Funds belong to
              principals and can only be withdrawn by them. Built for the Agent ID Hackathon.
            </span>
            <span>
              <a className="link" href={REPO} target="_blank" rel="noopener noreferrer">Source code</a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
