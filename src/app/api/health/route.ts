import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-memory startTime to measure process uptime
const startTime = Date.now();

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'localhost';
  const status: Record<string, any> = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    environment: process.env.NODE_ENV,
    checks: {
      database: 'DOWN',
      arcRpc: 'DOWN',
    },
    system: {
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    }
  };

  let isHealthy = true;

  // 1. Check Database Connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const useRealSupabase = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

    if (useRealSupabase && supabase) {
      // Execute a quick head request to test live Supabase connectivity
      const { error } = await supabase.from('users').select('address', { count: 'exact', head: true }).limit(1);
      if (error) {
        status.checks.database = `ERROR: ${error.message}`;
        isHealthy = false;
      } else {
        status.checks.database = 'UP (Supabase Connected)';
      }
    } else {
      // JSON fallback database checks
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.resolve(process.cwd(), 'src/contracts/db.json');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        status.checks.database = `UP (JSON Fallback DB, size: ${stats.size} bytes)`;
      } else {
        status.checks.database = 'UP (JSON Fallback DB - Uninitialized)';
      }
    }
  } catch (err: any) {
    status.checks.database = `ERROR: ${err.message || err}`;
    isHealthy = false;
  }

  // 2. Check Arc Network RPC Connectivity
  try {
    const rpcUrl = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      status.checks.arcRpc = 'UP';
    } else {
      status.checks.arcRpc = `ERROR: HTTP ${res.status}`;
      isHealthy = false;
    }
  } catch (err: any) {
    status.checks.arcRpc = `ERROR: ${err.name === 'AbortError' ? 'RPC Timeout (3s)' : err.message || err}`;
    isHealthy = false;
  }

  if (!isHealthy) {
    status.status = 'DEGRADED';
    return NextResponse.json(status, { status: 503 });
  }

  return NextResponse.json(status, { status: 200 });
}
