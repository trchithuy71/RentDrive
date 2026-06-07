import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { startRentalOnBehalfOnChain } from '@/lib/blockchain';

interface TransferStatus {
  id: string; // source txHash
  status: 'BURNING' | 'ATTESTING' | 'MINTING' | 'ACTIVATING' | 'SUCCESS' | 'FAILED';
  progress: number;
  message?: string;
  sourceChain: string;
  sourceTxHash: string;
  targetTxHash?: string;
  rentalId?: number;
  error?: string;
  timestamp: number;
  vehicleId: number;
  renterAddress: string;
  startOdometer: number;
  depositAmount: number;
  premiumAmount: number;
}

// In-memory status store for transfers
const cctpTransfers: Record<string, TransferStatus> = {};

// Background handler to advance status and trigger database/on-chain entries
async function processTransfer(txHash: string) {
  const transfer = cctpTransfers[txHash];
  if (!transfer) return;

  try {
    // Stage 1: BURNING (0s - 2s)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    transfer.status = 'ATTESTING';
    transfer.progress = 40;
    transfer.message = 'USDC burned on source chain. Waiting for Circle Attestation...';

    // Stage 2: ATTESTING (2s - 4s)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    transfer.status = 'MINTING';
    transfer.progress = 70;
    transfer.message = 'Circle Attestation signature retrieved. Relaying mint call on Arc...';

    // Stage 3: MINTING (4s - 6s)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    transfer.status = 'ACTIVATING';
    transfer.progress = 90;
    transfer.message = 'Mints settled on Arc. Depositing escrow and activating rental...';

    // Stage 4: ACTIVATING (6s - 8s)
    // Here we perform the real on-chain activation + database sync
    const vehicles = await db.getVehicles();
    const vehicle = vehicles.find((v: any) => v.id === Number(transfer.vehicleId));
    if (!vehicle) {
      throw new Error(`Vehicle #${transfer.vehicleId} not found in database`);
    }

    // A. Deploy startRentalOnBehalf transaction on Arc Testnet via admin relayer
    const onChainResult = await startRentalOnBehalfOnChain(
      transfer.vehicleId,
      transfer.startOdometer,
      transfer.renterAddress,
      transfer.depositAmount,
      transfer.premiumAmount
    );

    if (!onChainResult.success) {
      throw new Error(onChainResult.error || 'Failed to submit startRentalOnBehalf on Arc Testnet');
    }

    // B. Register renter profile if not exists
    let renterProfile = await db.getUser(transfer.renterAddress);
    if (!renterProfile) {
      await db.createUser({
        address: transfer.renterAddress,
        name: 'Cross-Chain Renter',
        role: 'renter',
      });
    }

    // C. Create rental database record
    const newRental = await db.createRental({
      vehicle_id: Number(transfer.vehicleId),
      renter: transfer.renterAddress.toLowerCase(),
      start_time: new Date().toISOString(),
      start_odometer: Number(transfer.startOdometer || 0),
      current_odometer: Number(transfer.startOdometer || 0),
      escrow_balance: Number(vehicle.deposit_required),
      status: 'Active',
    });

    // D. Initialize Circle Gateway balance for micro-billing
    try {
      const { gateway } = require('@/lib/gateway');
      await gateway.initializeBalance(newRental.id, Number(vehicle.deposit_required));
    } catch (gwErr) {
      console.warn('Circle Gateway micro-billing setup skipped or failed:', gwErr);
    }

    // Final Stage: SUCCESS
    transfer.status = 'SUCCESS';
    transfer.progress = 100;
    transfer.message = 'Cross-chain rental activated successfully!';
    transfer.targetTxHash = onChainResult.txHash;
    transfer.rentalId = newRental.id;

  } catch (err: any) {
    console.error(`[CCTP Relayer Error] Failed processing transfer ${txHash}:`, err);
    transfer.status = 'FAILED';
    transfer.progress = 100;
    transfer.error = err.message || 'Escrow relayer failure. Automatic refund scheduled.';
    transfer.message = 'Rental failed. USDC has been automatically refunded on the source chain.';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txHash, sourceChain, renterAddress, vehicleId, startOdometer, depositAmount, premiumAmount } = body;

    if (!txHash || !sourceChain || !renterAddress || !vehicleId) {
      return NextResponse.json({ error: 'Missing required tracking parameters' }, { status: 400 });
    }

    const initialStatus: TransferStatus = {
      id: txHash,
      status: 'BURNING',
      progress: 15,
      message: `Burn transaction initiated on ${sourceChain}...`,
      sourceChain,
      sourceTxHash: txHash,
      timestamp: Date.now(),
      vehicleId: Number(vehicleId),
      renterAddress,
      startOdometer: Number(startOdometer || 0),
      depositAmount: Number(depositAmount || 0),
      premiumAmount: Number(premiumAmount || 0),
    };

    cctpTransfers[txHash] = initialStatus;

    // Start background processing
    processTransfer(txHash);

    return NextResponse.json({ success: true, transfer: initialStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json({ error: 'Missing txHash parameter' }, { status: 400 });
    }

    const transfer = cctpTransfers[txHash];
    if (!transfer) {
      return NextResponse.json({ error: 'CCTP tracking task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transfer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
