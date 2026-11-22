"use client";

// Principal-side wallet access. The principal is the human's OWN main wallet (browser extension or the
// in-app browser of a wallet app), never the agent's Agentic Wallet, so there is no QR or pairing login
// for Agentic Wallets anywhere in this site. Every action is a normal wallet transaction the user confirms.
import { createWalletClient, custom, numberToHex, type Address, type Hex } from "viem";
import { MANDATE, chain, mandateAbi, publicClient } from "@/lib/chain";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function provider(): Eip1193 {
  const eth = (globalThis as unknown as { ethereum?: Eip1193 }).ethereum;
  if (!eth) throw new Error("No browser wallet found. Open this page in your wallet's browser or install a wallet extension.");
  return eth;
}

export async function connect(): Promise<Address> {
  const eth = provider();
  const [account] = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
  const current = Number(await eth.request({ method: "eth_chainId" }));
  if (current !== chain.id) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(chain.id) }] });
    } catch {
      throw new Error(`Please switch your wallet to ${chain.name} (chain id ${chain.id}).`);
    }
  }
  return account;
}

type Fn = "create" | "deposit" | "withdraw" | "revoke" | "approve" | "reject";

/** Simulates first (so a revert is explained before the wallet pops up), then asks the wallet to sign. */
export async function send(account: Address, functionName: Fn, args: readonly unknown[], value?: bigint): Promise<Hex> {
  const wallet = createWalletClient({ account, chain, transport: custom(provider()) });
  const { request } = await publicClient.simulateContract({
    account,
    address: MANDATE,
    abi: mandateAbi,
    functionName,
    args: args as never,
    value,
  } as never);
  const hash = await wallet.writeContract(request as never);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
