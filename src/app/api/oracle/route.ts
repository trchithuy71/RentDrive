import { NextRequest, NextResponse } from 'next/server';
import { getOraclesFromRegistry, registerOracleAgent, addOracleToRegistry, removeOracleFromRegistry } from '@/lib/blockchain';

export async function GET() {
  try {
    const oracles = await getOraclesFromRegistry();
    return NextResponse.json({
      success: true,
      oracles,
      threshold: "2-of-3",
    });
  } catch (error: any) {
    console.error('Failed to fetch oracle registry:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch oracle registry' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, address, metadataUri, weight } = body;

    if (action === 'register') {
      if (!address || !metadataUri) {
        return NextResponse.json({ error: 'Missing address or metadataUri' }, { status: 400 });
      }
      const res = await registerOracleAgent(address, metadataUri);
      return NextResponse.json({ success: true, result: res });
    }

    if (action === 'add') {
      if (!address || weight === undefined) {
        return NextResponse.json({ error: 'Missing address or weight' }, { status: 400 });
      }
      const res = await addOracleToRegistry(address, weight);
      return NextResponse.json({ success: true, result: res });
    }

    if (action === 'remove') {
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }
      const res = await removeOracleFromRegistry(address);
      return NextResponse.json({ success: true, result: res });
    }

    // Default action: compare matching telemetry reports to simulate consensus check
    const { reports } = body;
    if (!reports || !Array.isArray(reports) || reports.length < 2) {
      return NextResponse.json({ error: 'At least 2 reports are required for consensus check' }, { status: 400 });
    }

    // Determine consensus matching
    const reportHashes = reports.map((r: any) => {
      const serialized = JSON.stringify({
        odometer: r.odometer,
        speed: r.speed,
        crashDetected: !!r.crashDetected,
        geofenceViolated: !!r.geofenceViolated,
      });
      return { reporter: r.reporter, serialized };
    });

    const counts: { [key: string]: number } = {};
    const reportersByHash: { [key: string]: string[] } = {};

    reportHashes.forEach((item) => {
      counts[item.serialized] = (counts[item.serialized] || 0) + 1;
      if (!reportersByHash[item.serialized]) {
        reportersByHash[item.serialized] = [];
      }
      reportersByHash[item.serialized].push(item.reporter);
    });

    let consensusData = null;
    let consensusReached = false;
    const slashedOracles: string[] = [];

    for (const [serialized, count] of Object.entries(counts)) {
      if (count >= 2) { // 2-of-3 consensus met
        consensusData = JSON.parse(serialized);
        consensusReached = true;
      }
    }

    if (consensusReached && consensusData) {
      // Find divergent reporters to slash
      reportHashes.forEach((item) => {
        if (item.serialized !== JSON.stringify(consensusData)) {
          slashedOracles.push(item.reporter);
        }
      });
    }

    return NextResponse.json({
      success: true,
      consensusReached,
      consensusData,
      slashedOracles,
      totalReportsCount: reports.length,
    });
  } catch (error: any) {
    console.error('Oracle consensus endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
