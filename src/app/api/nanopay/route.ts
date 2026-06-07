import { NextRequest, NextResponse } from 'next/server';
import { gateway } from '@/lib/gateway';
import { db } from '@/lib/supabase';
import { updateTelemetryOnChain } from '@/lib/blockchain';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rentalId = searchParams.get('rentalId');

    if (!rentalId) {
      return NextResponse.json({ error: 'Missing rentalId' }, { status: 400 });
    }

    const state = await gateway.getState(Number(rentalId));
    if (!state) {
      return NextResponse.json({ success: false, initialized: false });
    }

    return NextResponse.json({ success: true, initialized: true, state });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, rentalId, amount } = body;

    if (!rentalId) {
      return NextResponse.json({ error: 'Missing rentalId' }, { status: 400 });
    }

    if (action === 'deposit') {
      const depositVal = Number(amount || 0);
      const state = await gateway.initializeBalance(Number(rentalId), depositVal);
      return NextResponse.json({ success: true, message: 'USDC deposited into Circle Gateway successfully', state });
    }

    if (action === 'settle') {
      const rental = await db.getRental(Number(rentalId));
      if (!rental) {
        return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
      }

      // 1. Fetch latest telemetry log for this rental to get last coordinates and speed
      const telemetryLogs = await db.getTelemetryLogs(Number(rentalId));
      const latestLog = telemetryLogs[telemetryLogs.length - 1];

      const currentOdo = latestLog ? Number(latestLog.odometer) : Number(rental.current_odometer || rental.start_odometer || 0);
      const currentSpeed = latestLog ? Number(latestLog.speed) : 0;
      const crashSensor = latestLog ? !!latestLog.crash_sensor : !!rental.crash_detected;
      const geofenceViolated = latestLog ? !!latestLog.geofence_violated : false;

      // 2. Perform on-chain settlement transaction via admin oracle
      console.log(`[Circle Gateway] Settling nanopayments on-chain for Rental #${rentalId}...`);
      const chainRes = await updateTelemetryOnChain(
        Number(rentalId),
        Math.round(currentOdo),
        Math.round(currentSpeed),
        crashSensor,
        geofenceViolated
      );

      if (!chainRes.success) {
        throw new Error(`On-chain settlement failed: ${chainRes.error}`);
      }

      // 3. Update settlement counts off-chain
      const state = await gateway.recordOnChainSettlement(Number(rentalId));

      return NextResponse.json({
        success: true,
        message: 'On-chain settlement completed',
        txHash: chainRes.txHash,
        state
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Nanopay API route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
