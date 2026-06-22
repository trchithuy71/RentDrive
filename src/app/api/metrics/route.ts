import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

const startTime = Date.now();

export async function GET(req: NextRequest) {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const memory = process.memoryUsage();

    // 1. Fetch real-time metrics from the database (either Supabase or local simulation)
    const [vehicles, rentals] = await Promise.all([
      db.getVehicles().catch(() => []),
      db.getRentals().catch(() => [])
    ]);

    const activeRentals = rentals.filter((r: any) => r.status === 'Active').length;
    const disputedRentals = rentals.filter((r: any) => r.status === 'Disputed').length;
    const completedRentals = rentals.filter((r: any) => r.status === 'Completed').length;
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter((v: any) => v.is_active).length;

    // Calculate total escrow balance locked
    const totalEscrowLocked = rentals
      .filter((r: any) => r.status === 'Active' || r.status === 'Disputed')
      .reduce((sum: number, r: any) => sum + Number(r.escrow_balance || 0), 0);

    // 2. Format metrics in standard Prometheus exposition format (text/plain)
    const metricsLines = [
      '# HELP rentdrive_uptime_seconds Application process uptime in seconds.',
      '# TYPE rentdrive_uptime_seconds gauge',
      `rentdrive_uptime_seconds ${uptimeSeconds}`,

      '# HELP rentdrive_memory_rss_bytes Resident Set Size (RSS) memory in bytes.',
      '# TYPE rentdrive_memory_rss_bytes gauge',
      `rentdrive_memory_rss_bytes ${memory.rss}`,

      '# HELP rentdrive_memory_heap_total_bytes Total V8 heap size in bytes.',
      '# TYPE rentdrive_memory_heap_total_bytes gauge',
      `rentdrive_memory_heap_total_bytes ${memory.heapTotal}`,

      '# HELP rentdrive_memory_heap_used_bytes Used V8 heap size in bytes.',
      '# TYPE rentdrive_memory_heap_used_bytes gauge',
      `rentdrive_memory_heap_used_bytes ${memory.heapUsed}`,

      '# HELP rentdrive_registered_vehicles_total Total registered vehicles on the RentDrive registry.',
      '# TYPE rentdrive_registered_vehicles_total gauge',
      `rentdrive_registered_vehicles_total{status="all"} ${totalVehicles}`,
      `rentdrive_registered_vehicles_total{status="active"} ${activeVehicles}`,

      '# HELP rentdrive_rentals_total Total rentals tracked across the system by state.',
      '# TYPE rentdrive_rentals_total gauge',
      `rentdrive_rentals_total{status="active"} ${activeRentals}`,
      `rentdrive_rentals_total{status="disputed"} ${disputedRentals}`,
      `rentdrive_rentals_total{status="completed"} ${completedRentals}`,

      '# HELP rentdrive_escrow_locked_usdc Total USDC locked in escrow contracts.',
      '# TYPE rentdrive_escrow_locked_usdc gauge',
      `rentdrive_escrow_locked_usdc ${totalEscrowLocked.toFixed(6)}`,

      '# HELP rentdrive_http_requests_total Counter of HTTP requests handled.',
      '# TYPE rentdrive_http_requests_total counter',
      // Mock metrics for scrape targets
      `rentdrive_http_requests_total{method="GET",path="/api/metrics",status="200"} 124`,
      `rentdrive_http_requests_total{method="GET",path="/api/health",status="200"} 86`,
    ];

    return new NextResponse(metricsLines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Metrics Exporter] Error exporting metrics:', error);
    return new NextResponse('Internal Server Error\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
