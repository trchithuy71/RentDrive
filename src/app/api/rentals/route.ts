import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { isValidAddress } from '@/lib/geofence';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const renter = searchParams.get('renter');
    if (renter) {
      if (!isValidAddress(renter)) {
        return NextResponse.json({ error: 'Invalid renter address parameter' }, { status: 400 });
      }
      const renterAddr = renter.toLowerCase();
      const allRentals = await db.getRentals();
      const userRentals = allRentals.filter((r: any) => r.renter.toLowerCase() === renterAddr);
      if (userRentals.length === 0) {
        if ((db as any).bootstrapRenter) {
          await (db as any).bootstrapRenter(renterAddr);
        }
      }
    }
    const list = await db.getRentals();
    return NextResponse.json({ success: true, rentals: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleId, renter, startOdometer } = body;

    if (!vehicleId || !renter || !isValidAddress(renter)) {
      return NextResponse.json({ error: 'Missing or invalid required parameters' }, { status: 400 });
    }

    // 1. Fetch vehicle configuration
    const vehicles = await db.getVehicles();
    const vehicle = vehicles.find((v: any) => v.id === Number(vehicleId));
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // 2. Register profile if not exists
    let renterProfile = await db.getUser(renter);
    if (!renterProfile) {
      await db.createUser({
        address: renter,
        name: 'Bob Renter',
        role: 'renter',
      });
    }

    // 3. Create Rental record
    const newRental = await db.createRental({
      vehicle_id: Number(vehicleId),
      renter: renter.toLowerCase(),
      start_time: new Date().toISOString(),
      start_odometer: Number(startOdometer || 0),
      current_odometer: Number(startOdometer || 0),
      escrow_balance: Number(vehicle.deposit_required),
      status: 'Active',
    });

    // 4. Initialize Circle Gateway escrow balance for micro-billing
    const { gateway } = require('@/lib/gateway');
    await gateway.initializeBalance(newRental.id, Number(vehicle.deposit_required));

    return NextResponse.json({ success: true, rental: newRental });
  } catch (error: any) {
    console.error('Start rental route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
