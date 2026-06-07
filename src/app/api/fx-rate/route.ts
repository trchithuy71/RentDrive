import { NextRequest, NextResponse } from 'next/server';
import { getIndicativeRate, type CurrencySymbol, isSupportedCurrency } from '@/lib/stablefx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = (searchParams.get('from') || 'USDC').toUpperCase();
    const to = (searchParams.get('to') || 'EURC').toUpperCase();
    const amount = searchParams.get('amount') || '1000.00';

    if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) {
      return NextResponse.json({ error: 'Unsupported currency pair' }, { status: 400 });
    }

    const rate = await getIndicativeRate(from as CurrencySymbol, to as CurrencySymbol, amount);

    return NextResponse.json({
      success: true,
      rate: rate.rate,
      inverseRate: rate.inverseRate,
      from: rate.from,
      to: rate.to,
      fee: rate.fee,
      feeCurrency: rate.feeCurrency,
      source: rate.source,
      timestamp: rate.timestamp,
    });
  } catch (error: any) {
    console.error('FX rate fetch error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
