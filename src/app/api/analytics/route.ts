import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { isValidAddress } from '@/lib/geofence';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner');

    if (!owner || !isValidAddress(owner)) {
      return NextResponse.json({ error: 'Invalid or missing owner address' }, { status: 400 });
    }

    const ownerAddr = owner.toLowerCase();

    // 1. Fetch all vehicles and filter by owner
    let allVehicles = await db.getVehicles();
    let ownerVehicles = allVehicles.filter(
      (v: any) => v.owner.toLowerCase() === ownerAddr
    );

    if (ownerVehicles.length === 0) {
      if ((db as any).bootstrapOwner) {
        await (db as any).bootstrapOwner(ownerAddr);
        allVehicles = await db.getVehicles();
        ownerVehicles = allVehicles.filter(
          (v: any) => v.owner.toLowerCase() === ownerAddr
        );
      }
    }

    const vehicleIds = new Set(ownerVehicles.map((v: any) => v.id));

    // 2. Fetch all rentals and filter by owner's vehicles
    const allRentals = await db.getRentals();
    const ownerRentals = allRentals.filter(
      (r: any) => vehicleIds.has(r.vehicle_id)
    );

    // 3. Compute aggregate analytics
    const totalVehicles = ownerVehicles.length;
    const activeRentals = ownerRentals.filter((r: any) => r.status === 'Active').length;
    
    // Revenue calculations split by currency
    let totalRevenueUsdc = 0;
    let totalRevenueEurc = 0;
    let speedPenaltiesCount = 0;
    let geofencePenaltiesCount = 0;

    // Daily revenue chart helper
    const dailyRevenueMap: Record<string, { usdc: number; eurc: number }> = {};

    ownerRentals.forEach((rental: any) => {
      const isEurc = (rental.payment_currency || 'USDC') === 'EURC';
      
      const distance = Number(rental.distance_charges_accrued || 0);
      const speedPenalties = Number(rental.speed_penalties_accrued || 0);
      const geofencePenalties = Number(rental.geofence_penalties_accrued || 0);
      
      // Calculate total cost for completed/active rentals
      const rentalCost = distance + speedPenalties + geofencePenalties;

      if (isEurc) {
        totalRevenueEurc += rentalCost;
      } else {
        totalRevenueUsdc += rentalCost;
      }

      if (speedPenalties > 0) speedPenaltiesCount++;
      if (geofencePenalties > 0) geofencePenaltiesCount++;

      // Daily grouping for chart
      const dateKey = new Date(rental.start_time).toISOString().split('T')[0];
      if (!dailyRevenueMap[dateKey]) {
        dailyRevenueMap[dateKey] = { usdc: 0, eurc: 0 };
      }
      if (isEurc) {
        dailyRevenueMap[dateKey].eurc += rentalCost;
      } else {
        dailyRevenueMap[dateKey].usdc += rentalCost;
      }
    });

    // Sort chart data chronologically
    const chartData = Object.entries(dailyRevenueMap)
      .map(([date, val]) => ({
        date,
        usdc: Number(val.usdc.toFixed(2)),
        eurc: Number(val.eurc.toFixed(2)),
        total: Number((val.usdc + val.eurc * 1.08).toFixed(2)), // indicative total in USD equivalent for combined chart
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fetch actual reviews to compute dynamic average rating
    const allReviews = await db.getReviews();
    const ownerReviews = allReviews.filter((r: any) => r.reviewee.toLowerCase() === ownerAddr);
    const averageRating = ownerReviews.length > 0
      ? Number((ownerReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / ownerReviews.length).toFixed(1))
      : 5.0;

    // Fill in empty chart points with 0 if chartData is empty or short (no mock numbers)
    if (chartData.length < 5) {
      const now = new Date();
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const exists = chartData.some(item => item.date === dateKey);
        if (!exists) {
          chartData.push({
            date: dateKey,
            usdc: 0,
            eurc: 0,
            total: 0,
          });
        }
      }
      chartData.sort((a, b) => a.date.localeCompare(b.date));
    }

    // 4. Calculate Vehicle Utilization & Metrics comparison
    const vehiclesMetrics = ownerVehicles.map((vehicle: any) => {
      const vehicleRentals = ownerRentals.filter((r: any) => r.vehicle_id === vehicle.id);
      const rentalCount = vehicleRentals.length;
      
      let vehicleRev = 0;
      let speedViolations = 0;
      let activeHours = 0;

      vehicleRentals.forEach((r: any) => {
        const cost = Number(r.distance_charges_accrued || 0) + 
                     Number(r.speed_penalties_accrued || 0) + 
                     Number(r.geofence_penalties_accrued || 0);
        vehicleRev += cost;

        if (Number(r.speed_penalties_accrued || 0) > 0) {
          speedViolations++;
        }

        // Calculate hours
        const start = new Date(r.start_time).getTime();
        const end = r.end_time ? new Date(r.end_time).getTime() : Date.now();
        activeHours += Math.max(0.1, (end - start) / (1000 * 60 * 60));
      });

      // Simple utilization logic: % of time rented in the last 7 days (168 hrs max)
      const maxHours = 168; 
      const utilizationRate = Math.min(100, Math.round((activeHours / maxHours) * 100)) || (rentalCount > 0 ? 35 : 0);

      return {
        id: vehicle.id,
        contractId: vehicle.contract_id,
        model: vehicle.model,
        plateNumber: vehicle.plate_number,
        isActive: vehicle.is_active,
        rentalCount,
        revenue: Number(vehicleRev.toFixed(2)),
        currency: vehicle.accepted_currency || 'USDC',
        utilizationRate,
        speedViolations,
      };
    });

    return NextResponse.json({
      success: true,
      analytics: {
        totalVehicles,
        activeRentals,
        totalRevenueUsdc: Number(totalRevenueUsdc.toFixed(2)),
        totalRevenueEurc: Number(totalRevenueEurc.toFixed(2)),
        speedPenaltiesCount,
        geofencePenaltiesCount,
        averageRating,
        chartData,
        vehiclesMetrics,
      },
    });
  } catch (error: any) {
    console.error('Analytics route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
