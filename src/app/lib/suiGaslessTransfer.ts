import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

const SUI_COIN = '0x2::sui::SUI';

/**
 * Build a gasless programmable transaction (TransactionKind) for a native SUI transfer.
 * Must not use `tx.gas` — required for Shinami / sponsored gas flows.
 */
export async function buildGaslessSuiTransferTransactionKind(params: {
  client: SuiClient;
  sender: string;
  recipient: string;
  amountMist: bigint;
}): Promise<Uint8Array> {
  const sender = normalizeSuiAddress(params.sender);
  const recipient = normalizeSuiAddress(params.recipient);
  const { client, amountMist } = params;

  if (amountMist <= 0n) {
    throw new Error('Transfer amount must be positive');
  }

  let cursor: string | null | undefined = undefined;
  const coinRefs: { coinObjectId: string; balance: string }[] = [];

  for (;;) {
    const page = await client.getCoins({
      owner: sender,
      coinType: SUI_COIN,
      cursor: cursor ?? null,
      limit: 100,
    });
    coinRefs.push(...page.data.map((c) => ({ coinObjectId: c.coinObjectId, balance: c.balance })));
    if (!page.hasNextPage) {
      break;
    }
    cursor = page.nextCursor ?? null;
  }

  if (coinRefs.length === 0) {
    throw new Error('No SUI coins for this address');
  }

  const total = coinRefs.reduce((acc, c) => acc + BigInt(c.balance), 0n);
  if (total < amountMist) {
    throw new Error('Insufficient SUI balance');
  }

  const primary = coinRefs.reduce((a, b) => (BigInt(a.balance) >= BigInt(b.balance) ? a : b));
  const primaryId = primary.coinObjectId;

  const tx = new Transaction();
  tx.setSender(sender);

  const others = coinRefs.filter((c) => c.coinObjectId !== primaryId);
  if (others.length > 0) {
    tx.mergeCoins(
      tx.object(primaryId),
      others.map((c) => tx.object(c.coinObjectId)),
    );
  }

  if (total === amountMist) {
    tx.transferObjects([tx.object(primaryId)], recipient);
  } else {
    const [sendCoin] = tx.splitCoins(tx.object(primaryId), [amountMist]);
    tx.transferObjects([sendCoin], recipient);
  }

  return tx.build({ client, onlyTransactionKind: true });
}
