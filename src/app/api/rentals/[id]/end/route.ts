import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rentalId = Number(id);

    // 1. Fetch rental configuration
    const rental = await db.getRental(rentalId);
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
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const endTime = new Date();
    const startTime = new Date(rental.start_time);
    
    // Calculate time duration charges
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60))); // Min 1 hour, ceil rounding
    const timeCharge = durationHours * Number(vehicle.base_rate_per_hour);

    // Total cost accrued
    const distanceCharges = Number(rental.distance_charges_accrued || 0);
    const speedPenalties = Number(rental.speed_penalties_accrued || 0);
    const totalCost = timeCharge + distanceCharges + speedPenalties;

    // Escrow resolution logic
    const deposit = Number(vehicle.deposit_required);
    let refundAmount = 0;
    let payoutToOwner = 0;

    if (deposit > totalCost) {
      refundAmount = deposit - totalCost;
      payoutToOwner = totalCost - speedPenalties; // Base rate + distance charges
    } else {
      payoutToOwner = deposit - speedPenalties;
      refundAmount = 0;
    }

    // Speed penalties go directly to the owner
    const totalOwnerPayout = payoutToOwner + speedPenalties;

    // Deduct 2% platform fee
    const platformFee = (totalOwnerPayout * 2) / 100;
    const netOwnerPayout = totalOwnerPayout - platformFee;

    // 3. Update rental state in Database
    const updatedRental = await db.updateRental(rentalId, {
      end_time: endTime.toISOString(),
      status: 'Completed',
      escrow_balance: 0,
    });

    return NextResponse.json({
      success: true,
      rental: updatedRental,
      summary: {
        durationHours,
        timeCharge,
        distanceCharges,
        speedPenalties,
        totalCost,
        refundAmount,
        ownerPayout: netOwnerPayout,
        platformFee,
      },
    });
  } catch (error: any) {
    console.error('End rental route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
