import {
  WALRUS_AGGREGATOR_URL,
  WALRUS_DELETABLE,
  WALRUS_PUBLISHER_URL,
  WALRUS_STORAGE_EPOCHS,
} from '../config'

type WalrusStoreResponse = {
  newlyCreated?: {
    blobObject?: {
      id?: string
      blobId?: string
      size?: number
      certifiedEpoch?: number
      storage?: {
        endEpoch?: number
      }
      deletable?: boolean
    }
  }
  alreadyCertified?: {
    blobId?: string
    endEpoch?: number
    event?: {
      txDigest?: string
      eventSeq?: string
    }
  }
  message?: string
  error?: string
}

export type WalrusStoredBlob = {
  blobId: string
  url: string
  objectId?: string
  size?: number
  endEpoch?: number
  certifiedEpoch?: number
  txDigest?: string
  eventSeq?: string
  deletable?: boolean
}

export function getWalrusBlobUrl(blobId: string): string {
  if (!WALRUS_AGGREGATOR_URL) {
    return `walrus://${blobId}`
  }

  return `${WALRUS_AGGREGATOR_URL}/v1/blobs/${encodeURIComponent(blobId)}`
}

export async function storeWalrusBlob(
  body: Blob,
  options: {
    epochs?: number
    contentType?: string
    sendObjectTo?: string
    deletable?: boolean
  } = {},
): Promise<WalrusStoredBlob> {
  if (!WALRUS_PUBLISHER_URL) {
    throw new Error('Walrus publisher URL is not configured. Set VITE_WALRUS_PUBLISHER_URL.')
  }

  const params = new URLSearchParams()
  params.set('epochs', String(options.epochs ?? WALRUS_STORAGE_EPOCHS))
  params.set(options.deletable ?? WALRUS_DELETABLE ? 'deletable' : 'permanent', 'true')
  if (options.sendObjectTo) {
    params.set('send_object_to', options.sendObjectTo)
  }

  const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs?${params.toString()}`, {
    method: 'PUT',
    headers: {
      'Content-Type': options.contentType || body.type || 'application/octet-stream',
    },
    body,
  })

  let payload: WalrusStoreResponse
  try {
    payload = (await response.json()) as WalrusStoreResponse
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Walrus upload failed: ${response.status}`)
  }

  const blobObject = payload.newlyCreated?.blobObject
  const blobId = blobObject?.blobId ?? payload.alreadyCertified?.blobId
  if (!blobId) {
    throw new Error('Walrus upload response did not include blobId.')
  }

  return {
    blobId,
    url: getWalrusBlobUrl(blobId),
    objectId: blobObject?.id,
    size: blobObject?.size,
    endEpoch: blobObject?.storage?.endEpoch ?? payload.alreadyCertified?.endEpoch,
    certifiedEpoch: blobObject?.certifiedEpoch,
    txDigest: payload.alreadyCertified?.event?.txDigest,
    eventSeq: payload.alreadyCertified?.event?.eventSeq,
    deletable: blobObject?.deletable,
  }
}

export async function storeWalrusJson(value: unknown, options?: Parameters<typeof storeWalrusBlob>[1]): Promise<WalrusStoredBlob> {
  return storeWalrusBlob(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    {
      ...options,
      contentType: 'application/json',
    },
  )
}
