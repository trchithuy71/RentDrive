import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const list = await db.getVehicles();
    return NextResponse.json({ success: true, vehicles: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { owner, plateNumber, model, imageUrl, baseRate, ratePerKm, speedLimit, speedPenalty, deposit } = body;

    if (!owner || !plateNumber || !model || !deposit) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const newVehicle = await db.createVehicle({
      owner: owner.toLowerCase(),
      plate_number: plateNumber,
      model,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600',
      base_rate_per_hour: Number(baseRate || 0),
      rate_per_km: Number(ratePerKm || 0),
      speed_limit_kmh: Number(speedLimit || 100),
      speed_penalty_usdc: Number(speedPenalty || 0),
      deposit_required: Number(deposit),
      is_active: true,
    });

    return NextResponse.json({ success: true, vehicle: newVehicle });
  } catch (error: any) {
    console.error('Vehicle listing route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
