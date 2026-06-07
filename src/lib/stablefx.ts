/**
 * StableFX Integration — USDC ↔ EURC FX Rate Engine
 * 
 * Circle's StableFX provides institutional-grade RFQ execution with
 * on-chain settlement on Arc. This module provides:
 * 1. Indicative FX rate fetching for display purposes
 * 2. Tradable quote creation for actual swaps
 * 3. Currency metadata and formatting utilities
 * 
 * API Base: https://api.circle.com
 * Docs: https://developers.circle.com/stablefx.md
 */

// ─── Token Registry ──────────────────────────────────────────────────
export const CURRENCY_CONFIG = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x3600000000000000000000000000000000000000',
    icon: '$',
    color: '#2775CA',
    bgColor: '#EBF2FB',
    borderColor: '#B8D4F0',
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    icon: '€',
    color: '#1A47B8',
    bgColor: '#E8ECF7',
    borderColor: '#A8B8E0',
  },
} as const;

export type CurrencySymbol = keyof typeof CURRENCY_CONFIG;

export interface FXRate {
  from: CurrencySymbol;
  to: CurrencySymbol;
  rate: number;
  inverseRate: number;
  fee: number;
  feeCurrency: CurrencySymbol;
  timestamp: number;
  source: 'stablefx_api' | 'fallback';
}

export interface FXQuote {
  id: string;
  from: { currency: CurrencySymbol; amount: string };
  to: { currency: CurrencySymbol; amount: string };
  rate: string;
  fee: { currency: CurrencySymbol; amount: string };
  expiresAt: string;
  typedData?: any;
}

// ─── StableFX API Client ──────────────────────────────────────────────
const STABLEFX_API_BASE = 'https://api.circle.com/v1/exchange/stablefx';

/**
 * Get the StableFX API key from environment.
 * Uses TEST key for Arc Testnet.
 */
function getApiKey(): string | null {
  return process.env.CIRCLE_STABLEFX_API_KEY || process.env.NEXT_PUBLIC_CIRCLE_STABLEFX_API_KEY || null;
}

/**
 * Fetch a live indicative FX rate from StableFX API.
 * Falls back to a reasonable market estimate if API is unavailable.
 */
export async function getIndicativeRate(
  from: CurrencySymbol = 'USDC',
  to: CurrencySymbol = 'EURC',
  amount: string = '1000.00'
): Promise<FXRate> {
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const res = await fetch(`${STABLEFX_API_BASE}/quotes`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: { currency: from, amount },
          to: { currency: to },
          tenor: 'instant',
          type: 'indicative',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rate = parseFloat(data.rate);
        return {
          from,
          to,
          rate,
          inverseRate: 1 / rate,
          fee: data.fee ? parseFloat(data.fee.amount) : 0,
          feeCurrency: data.fee?.currency || from,
          timestamp: Date.now(),
          source: 'stablefx_api',
        };
      }
    } catch (err) {
      console.warn('[StableFX] API call failed, using fallback rate:', err);
    }
  }

  // Fallback: approximate EUR/USD rate (~0.92 EURC per USDC)
  const fallbackRate = from === 'USDC' ? 0.92 : 1.087;
  return {
    from,
    to,
    rate: fallbackRate,
    inverseRate: 1 / fallbackRate,
    fee: 0,
    feeCurrency: from,
    timestamp: Date.now(),
    source: 'fallback',
  };
}

/**
 * Request a tradable quote from StableFX for actual swap execution.
 * Requires a valid API key and recipient wallet address.
 */
export async function getTradableQuote(
  from: CurrencySymbol,
  to: CurrencySymbol,
  amount: string,
  recipientAddress: string
): Promise<FXQuote | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[StableFX] No API key configured for tradable quotes');
    return null;
  }

  try {
    const res = await fetch(`${STABLEFX_API_BASE}/quotes`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: { currency: from, amount },
        to: { currency: to },
        tenor: 'instant',
        type: 'tradable',
        recipientAddress,
      }),
    });

    if (res.ok) {
      return await res.json();
    }

    console.error('[StableFX] Quote request failed:', res.status, await res.text());
    return null;
  } catch (err) {
    console.error('[StableFX] Quote request error:', err);
    return null;
  }
}

// ─── Currency Formatting Utilities ────────────────────────────────────

/**
 * Convert an amount from one currency to another using FX rate.
 */
export function convertAmount(
  amount: number,
  rate: number
): number {
  return Number((amount * rate).toFixed(6));
}

/**
 * Format a currency amount for display with symbol prefix.
 */
export function formatCurrency(amount: number, currency: CurrencySymbol): string {
  const config = CURRENCY_CONFIG[currency];
  return `${config.icon}${amount.toFixed(2)}`;
}

/**
 * Format a currency amount with token suffix (e.g., "200.00 USDC").
 */
export function formatCurrencyWithSymbol(amount: number, currency: CurrencySymbol): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Get the token contract address for a currency on Arc Testnet.
 */
export function getTokenAddress(currency: CurrencySymbol): string {
  return CURRENCY_CONFIG[currency].address;
}

/**
 * Check if a currency is supported.
 */
export function isSupportedCurrency(currency: string): currency is CurrencySymbol {
  return currency === 'USDC' || currency === 'EURC';
}
