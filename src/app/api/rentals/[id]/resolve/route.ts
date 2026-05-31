import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { resolveDisputeOnChain } from '@/lib/blockchain';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rentalId = Number(id);
    const body = await req.json();
    const { payoutToOwner, refundToRenter } = body;

    if (payoutToOwner === undefined || refundToRenter === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch rental configuration
    const rental = await db.getRental(rentalId);
    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    if (rental.status !== 'Disputed') {
      return NextResponse.json({ error: 'Rental is not disputed' }, { status: 400 });
    }

    // 2. Push dispute resolution on-chain
    // Convert to integers / USDC format for Solidity (6 decimals)
    const ownerPayout6 = Math.round(Number(payoutToOwner) * 1e6);
    const renterRefund6 = Math.round(Number(refundToRenter) * 1e6);

    console.log(`[Dispute Resolver] Resolving dispute on-chain for Rental #${rentalId}...`);
    const chainRes = await resolveDisputeOnChain(rentalId, ownerPayout6, renterRefund6);

    if (!chainRes.success) {
      console.warn(`[Dispute Resolver] On-chain resolution failed: ${chainRes.error}. Continuing with DB update...`);
    }

    // 3. Update rental state in Database
    const updatedRental = await db.updateRental(rentalId, {
      status: 'Resolved',
      escrow_balance: 0,
    });

    return NextResponse.json({
      success: true,
      rental: updatedRental,
      onChainTxHash: chainRes.txHash || null,
      onChainResolved: chainRes.success,
    });
  } catch (error: any) {
    console.error('Resolve dispute route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
