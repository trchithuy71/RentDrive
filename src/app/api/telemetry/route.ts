import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { updateTelemetryOnChain } from '@/lib/blockchain';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rentalId, latitude, longitude, speed, odometer, crashSensor } = body;

    if (!rentalId || latitude === undefined || longitude === undefined || speed === undefined || odometer === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch active rental
    const rental = await db.getRental(Number(rentalId));
    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    if (rental.status !== 'Active') {
      return NextResponse.json({ error: 'Rental is not active' }, { status: 400 });
    }

    // 2. Fetch vehicle configuration
    const vehicles = await db.getVehicles();
    const vehicle = vehicles.find((v: any) => v.id === rental.vehicle_id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Associated vehicle not found' }, { status: 404 });
    }

    // 3. Log Telemetry to Database
    const log = await db.addTelemetryLog({
      rental_id: Number(rentalId),
      latitude,
      longitude,
      speed,
      odometer,
      crash_sensor: !!crashSensor,
    });

    // 4. Calculate Distance Charge delta
    const previousOdometer = Number(rental.current_odometer || rental.start_odometer || 0);
    const odometerDelta = Math.max(0, odometer - previousOdometer); // in meters
    const odometerDeltaKm = odometerDelta / 1000.0;
    const distanceChargeDelta = odometerDeltaKm * Number(vehicle.rate_per_km);

    let updatedDistanceCharges = Number(rental.distance_charges_accrued || 0) + distanceChargeDelta;
    let updatedSpeedPenalties = Number(rental.speed_penalties_accrued || 0);
    let updatedCrashDetected = rental.crash_detected || !!crashSensor;

    // 5. Calculate Speed Penalty if limit is breached
    if (speed > Number(vehicle.speed_limit_kmh)) {
      updatedSpeedPenalties += Number(vehicle.speed_penalty_usdc);
    }

    // Determine updated rental status
    let updatedStatus = rental.status;
    if (updatedCrashDetected) {
      updatedStatus = 'Disputed';
    }

    // 6. Push Oracle Update On-Chain
    // Convert to integers / USDC format for Solidity (6 decimals)
    const odoMeters = Math.round(odometer);
    const currentSpeed = Math.round(speed);
    
    console.log(`[Oracle Router] Reporting telemetry on chain for Rental #${rentalId}...`);
    const chainRes = await updateTelemetryOnChain(
      Number(rentalId),
      odoMeters,
      currentSpeed,
      updatedCrashDetected
    );

    if (!chainRes.success) {
      console.warn(`[Oracle Router] On-chain update failed: ${chainRes.error}. Continuing with DB update...`);
    }

    // 7. Update Rental record in database
    const updatedRental = await db.updateRental(Number(rentalId), {
      current_odometer: odometer,
      distance_charges_accrued: updatedDistanceCharges,
      speed_penalties_accrued: updatedSpeedPenalties,
      crash_detected: updatedCrashDetected,
      status: updatedStatus,
    });

    return NextResponse.json({
      success: true,
      log,
      rental: updatedRental,
      onChainTxHash: chainRes.txHash || null,
      onChainUpdated: chainRes.success,
    });
  } catch (error: any) {
    console.error('Telemetry reporting route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
