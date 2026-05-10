/**
 * Minimal Phantom / Solflare integration for wallet link (ed25519 signMessage → Laravel verifies via sodium).
 */

export type InjectedSolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey: { toBase58(): string; toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58(): string; toString(): string } }>;
  disconnect?: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding?: 'utf8' | string) => Promise<{ signature: Uint8Array }>;
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function getPhantomSolanaProvider(): InjectedSolanaProvider | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const solana = (window as unknown as { solana?: InjectedSolanaProvider }).solana;
  return solana?.isPhantom ? solana : null;
}

export function getSolflareSolanaProvider(): InjectedSolanaProvider | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const solflare = (window as unknown as { solflare?: InjectedSolanaProvider }).solflare;
  return solflare?.isSolflare ? solflare : null;
}

export async function signSolanaLinkMessage(
  provider: InjectedSolanaProvider,
  messageUtf8: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(messageUtf8);
  const signed = await provider.signMessage(encoded, 'utf8');
  if (!signed?.signature || !(signed.signature instanceof Uint8Array)) {
    throw new Error('Solana wallet did not return a signature.');
  }
  return uint8ArrayToBase64(signed.signature);
}
