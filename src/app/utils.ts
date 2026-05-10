import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { GNOSIS_SAFE_CHAIN_ID, GNOSIS_SAFE_ADDRESS } from './config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface AssetBalance {
  tokenAddress: string | null
  token: {
    name: string
    symbol: string
    decimals: number
    logoUri: string
  } | null
  balance: string
  fiatBalance: string
  fiatConversion: string
}

export async function fetchSafeBalances(): Promise<AssetBalance[]> {
  const url = `https://safe-client.safe.global/v1/chains/${GNOSIS_SAFE_CHAIN_ID}/safes/${GNOSIS_SAFE_ADDRESS}/balances`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch safe balances')
  }
  return response.json()
}
