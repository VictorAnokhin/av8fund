import { genAddressSeed, type ZkLoginSignatureInputs } from '@mysten/sui/zklogin';

type ZkLoginSessionProofSource = {
  jwt?: string;
  salt?: string;
  proof: unknown;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getJwtAudience(payload: Record<string, unknown>): string | null {
  const aud = payload.aud;
  if (typeof aud === 'string' && aud.trim()) {
    return aud;
  }

  if (Array.isArray(aud)) {
    return aud.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
  }

  return null;
}

function buildZkLoginProofFallbacksFromSession(session: ZkLoginSessionProofSource): Record<string, string> {
  const fallback: Record<string, string> = {};
  const jwt = typeof session.jwt === 'string' ? session.jwt : '';
  const salt = typeof session.salt === 'string' ? session.salt : '';
  const [headerBase64] = jwt.split('.');
  if (headerBase64) {
    fallback.headerBase64 = headerBase64;
  }

  const payload = jwt ? decodeJwtPayload(jwt) : null;
  const sub = payload && typeof payload.sub === 'string' ? payload.sub : null;
  const aud = payload ? getJwtAudience(payload) : null;
  if (salt && sub && aud) {
    fallback.addressSeed = genAddressSeed(salt, 'sub', sub, aud).toString();
  }

  return fallback;
}

function findZkLoginProofObject(raw: Record<string, unknown>): Record<string, unknown> | null {
  const queue: unknown[] = [raw];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const candidate = queue.shift();
    if (candidate === null || typeof candidate !== 'object' || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    const objectCandidate = candidate as Record<string, unknown>;
    if (objectCandidate.proofPoints ?? objectCandidate.proof_points) {
      return objectCandidate;
    }

    queue.push(
      objectCandidate.inputs,
      objectCandidate.proof,
      objectCandidate.zkLoginSignatureInputs,
      objectCandidate.zk_login_signature_inputs,
      objectCandidate.data,
    );
  }

  return null;
}

/**
 * Maps prover / API payloads (camelCase or snake_case) into the shape required by {@link getZkLoginSignature}.
 * Stale localStorage sessions or backend JSON key casing must not leave `undefined` strings in the proof.
 */
export function normalizeZkLoginProofForSigning(raw: unknown): ZkLoginSignatureInputs {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('zkLogin proof is missing or invalid. Sign in with Google again.');
  }

  const root = raw as Record<string, unknown>;
  const nested = findZkLoginProofObject(root);

  if (!nested) {
    throw new Error('zkLogin proofPoints missing. Sign in with Google again.');
  }

  const o = nested;
  const proofPointsRaw = (o.proofPoints ?? o.proof_points) as Record<string, unknown> | undefined;
  if (!proofPointsRaw || typeof proofPointsRaw !== 'object') {
    throw new Error('zkLogin proofPoints missing. Sign in with Google again.');
  }

  const a = proofPointsRaw.a as string[] | undefined;
  const b = proofPointsRaw.b as string[][] | undefined;
  const c = proofPointsRaw.c as string[] | undefined;
  if (!Array.isArray(a) || !Array.isArray(b) || !Array.isArray(c)) {
    throw new Error('zkLogin proof points incomplete. Sign in with Google again.');
  }

  const issRaw = (o.issBase64Details ?? o.iss_base64_details) as Record<string, unknown> | undefined;
  if (!issRaw || typeof issRaw !== 'object') {
    throw new Error('zkLogin issBase64Details missing. Sign in with Google again.');
  }

  const issValue = issRaw.value as string | undefined;
  const indexRaw = issRaw.indexMod4 ?? issRaw.index_mod_4;
  const indexMod4 = typeof indexRaw === 'number' ? indexRaw : Number(indexRaw);
  if (typeof issValue !== 'string' || !Number.isFinite(indexMod4)) {
    throw new Error('zkLogin issBase64Details invalid. Sign in with Google again.');
  }

  const headerBase64 = (o.headerBase64 ?? o.header_base64 ?? root.headerBase64 ?? root.header_base64) as string | undefined;
  const addressSeed = (o.addressSeed ?? o.address_seed ?? root.addressSeed ?? root.address_seed) as string | undefined;
  if (typeof headerBase64 !== 'string' || typeof addressSeed !== 'string') {
    throw new Error('zkLogin headerBase64 or addressSeed missing. Sign in with Google again.');
  }

  return {
    proofPoints: { a, b, c },
    issBase64Details: { value: issValue, indexMod4 },
    headerBase64,
    addressSeed,
  };
}

export function normalizeZkLoginSessionProofForSigning(session: ZkLoginSessionProofSource): ZkLoginSignatureInputs {
  const proofObject = session.proof !== null && typeof session.proof === 'object'
    ? session.proof as Record<string, unknown>
    : {};

  return normalizeZkLoginProofForSigning({
    ...proofObject,
    ...buildZkLoginProofFallbacksFromSession(session),
  });
}
