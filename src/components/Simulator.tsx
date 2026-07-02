'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Cpu, Play, Square, AlertTriangle, ShieldCheck, MapPin, Gauge, Orbit, CheckCircle2 } from 'lucide-react';

interface Rental {
  id: number;
  vehicle_id: number;
  renter: string;
  start_time: string;
  start_odometer?: number;
  current_odometer: number;
  escrow_balance: number;
  status: string;
  crash_detected: boolean;
  distance_charges_accrued: number;
  speed_penalties_accrued: number;
  geofence_penalties_accrued?: number;
}

interface Vehicle {
  id: number;
  model: string;
  speed_limit_kmh: number;
  rate_per_km: number;
  speed_penalty_usdc: number;
  deposit_required: number;
  geofence_center_lat?: number;
  geofence_center_lng?: number;
  geofence_radius_meters?: number;
  geofence_violation_penalty?: number;
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function Simulator() {
  const { isConnected, address } = useAccount();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<number | null>(null);

  // Simulated OBD-II State
  const [speed, setSpeed] = useState(60);
  const [odometer, setOdometer] = useState(100000); // meters
  const [crashSensor, setCrashSensor] = useState(false);
  
  // Coordinates (Centered in Hanoi, Vietnam)
  const [lat, setLat] = useState(21.028511);
  const [lng, setLng] = useState(105.804817);

  // Auto-drive interval
  const [isDriving, setIsDriving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Circle Gateway Nanopayments State
  const [gatewayDeposit, setGatewayDeposit] = useState(0);
  const [nanopaymentsAccumulated, setNanopaymentsAccumulated] = useState(0);
  const [gasSaved, setGasSaved] = useState(0);
  const [updatesCount, setUpdatesCount] = useState(0);
  const [settlementsCount, setSettlementsCount] = useState(0);

  useEffect(() => {
    if (selectedRentalId) {
      fetchGatewayState(selectedRentalId);
    }
  }, [selectedRentalId]);

  const fetchGatewayState = async (id: number) => {
    try {
      const res = await fetch(`/api/nanopay?rentalId=${id}`);
      const data = await res.json();
      if (data.success && data.state) {
        setGatewayDeposit(data.state.gatewayDeposit);
        setNanopaymentsAccumulated(data.state.nanopaymentsAccumulated);
        setGasSaved(data.state.gasSavedUsdc);
        setUpdatesCount(data.state.telemetryUpdateCount);
        setSettlementsCount(data.state.onchainSettlementCount);
      } else {
        // Initialize deposit automatically with the rental deposit required
        const matchRental = rentals.find(r => r.id === id);
        const initAmt = matchRental ? Number(matchRental.escrow_balance || 200) : 200;
        const initRes = await fetch(`/api/nanopay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deposit', rentalId: id, amount: initAmt })
        });
        const initData = await initRes.json();
        if (initData.success && initData.state) {
          setGatewayDeposit(initData.state.gatewayDeposit);
          setNanopaymentsAccumulated(initData.state.nanopaymentsAccumulated);
          setGasSaved(initData.state.gasSavedUsdc);
          setUpdatesCount(initData.state.telemetryUpdateCount);
          setSettlementsCount(initData.state.onchainSettlementCount);
        }
      }
    } catch (e) {
      console.error('Failed to fetch gateway state:', e);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [address]);

  const fetchRentals = async () => {
    try {
      const url = address ? `/api/rentals?renter=${address}` : '/api/rentals';
      const [rentalsRes, vehiclesRes] = await Promise.all([
        fetch(url),
        fetch('/api/vehicles')
      ]);
      const rData = await rentalsRes.json();
      const vData = await vehiclesRes.json();
      if (rData.success && vData.success) {
        const active = rData.rentals.filter((r: Rental) => r.status === 'Active');
        setRentals(active);
        setVehicles(vData.vehicles);
        if (active.length > 0) {
          setSelectedRentalId(active[0].id);
          setOdometer(Number(active[0].current_odometer || active[0].start_odometer || 100000));
        }
      }
    } catch (e) {
      console.error('Failed to fetch rentals:', e);
    }
  };

  const selectedRental = rentals.find(r => r.id === selectedRentalId);
  const selectedVehicle = selectedRental ? vehicles.find(v => v.id === selectedRental.vehicle_id) : null;

  const centerLat = selectedVehicle?.geofence_center_lat !== undefined ? Number(selectedVehicle.geofence_center_lat) : 21.028511;
  const centerLng = selectedVehicle?.geofence_center_lng !== undefined ? Number(selectedVehicle.geofence_center_lng) : 105.804817;
  const radiusMeters = selectedVehicle?.geofence_radius_meters !== undefined ? Number(selectedVehicle.geofence_radius_meters) : 5000;
  const violationPenalty = selectedVehicle?.geofence_violation_penalty !== undefined ? Number(selectedVehicle.geofence_violation_penalty) : 0;

  const currentDistance = haversineDistance(lat, lng, centerLat, centerLng);
  const isInsideGeofence = currentDistance <= radiusMeters;

  // Auto Drive Simulator Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDriving && selectedRentalId) {
      interval = setInterval(() => {
        const deltaLat = (Math.random() - 0.5) * 0.0005;
        const deltaLng = (Math.random() - 0.5) * 0.0005;
        setLat(prev => prev + deltaLat);
        setLng(prev => prev + deltaLng);

        const metersPerSec = speed / 3.6;
        const metersInPeriod = Math.round(metersPerSec * 3);
        setOdometer(prev => prev + metersInPeriod);

        sendTelemetryUpdate(metersInPeriod);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isDriving, selectedRentalId, speed, odometer, crashSensor, lat, lng]);

  const sendTelemetryUpdate = async (metersIncrement: number = 0) => {
    if (!selectedRentalId) return;
    setSubmitting(true);
    
    const telemetryBody = {
      rentalId: selectedRentalId,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      speed: Number(speed),
      odometer: Number(odometer + metersIncrement),
      crashSensor,
    };

    try {
      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetryBody),
      });

      const data = await res.json();
      if (data.success) {
        const timestamp = new Date().toLocaleTimeString();
        let logMsg = `[${timestamp}] Lat:${telemetryBody.latitude}, Lng:${telemetryBody.longitude} | Odo: ${(telemetryBody.odometer / 1000).toFixed(3)} km`;
        
        // Output routing details
        if (data.onChainUpdated) {
          logMsg += ` | ⛓️ BATCH SETTLED ON-CHAIN (tx: ${data.onChainTxHash?.substring(0, 8)}...)`;
        } else {
          logMsg += ` | ⚡ GASLESS NANOPAYMENT`;
        }

        if (selectedVehicle && speed > selectedVehicle.speed_limit_kmh) {
          logMsg += ` ⚠️ SPEED LIMIT BREACHED (-${selectedVehicle.speed_penalty_usdc} USDC)`;
        }

        if (!isInsideGeofence) {
          logMsg += ` 🚨 GEOFENCE OUT OF BOUNDS (-${violationPenalty} USDC)`;
        }
        
        if (crashSensor) {
          logMsg += ` 💥 CRASH DETECTED! Escrow Locked.`;
          setIsDriving(false);
        }

        setLogs(prev => [logMsg, ...prev.slice(0, 15)]);
        
        if (data.onChainTxHash) {
          setLastTxHash(data.onChainTxHash);
        }

        if (data.gatewayState) {
          setGatewayDeposit(data.gatewayState.gatewayDeposit);
          setNanopaymentsAccumulated(data.gatewayState.nanopaymentsAccumulated);
          setGasSaved(data.gatewayState.gasSavedUsdc);
          setUpdatesCount(data.gatewayState.telemetryUpdateCount);
          setSettlementsCount(data.gatewayState.onchainSettlementCount);
        }

        if (selectedRental) {
          selectedRental.current_odometer = telemetryBody.odometer;
          selectedRental.distance_charges_accrued = data.rental.distance_charges_accrued;
          selectedRental.speed_penalties_accrued = data.rental.speed_penalties_accrued;
          selectedRental.geofence_penalties_accrued = data.rental.geofence_penalties_accrued;
          selectedRental.escrow_balance = data.rental.escrow_balance;
          selectedRental.status = data.rental.status;
          if (data.rental.status === 'Disputed') {
            fetchRentals();
          }
        }
      }
    } catch (e: any) {
      console.error('Failed to submit telemetry:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerImpact = () => {
    setCrashSensor(true);
    setTimeout(() => {
      sendTelemetryUpdate();
    }, 100);
  };

  // Retro Radar Map Canvas State
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [trail, setTrail] = useState<{lat: number, lng: number}[]>([]);
  const [pulseTime, setPulseTime] = useState(0);

  // Pulse animation loop
  useEffect(() => {
    const handle = setInterval(() => {
      setPulseTime(prev => (prev + 1) % 10);
    }, 150);
    return () => clearInterval(handle);
  }, []);

  // Update path trail
  useEffect(() => {
    if (!selectedRentalId) {
      setTrail([]);
      return;
    }
    setTrail(prev => {
      if (prev.length > 0 && prev[prev.length - 1].lat === lat && prev[prev.length - 1].lng === lng) {
        return prev;
      }
      const nextTrail = [...prev, { lat, lng }];
      return nextTrail.slice(-40);
    });
  }, [lat, lng, selectedRentalId]);

  // Radar drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid background
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 20; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 20; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Determine scale based on geofence radius
    const currentRadius = selectedVehicle?.geofence_radius_meters !== undefined ? Number(selectedVehicle.geofence_radius_meters) : 5000;
    const limitPx = Math.min(width, height) * 0.35;
    const scale = limitPx / Math.max(currentRadius, 100);

    // Draw geofence circle
    ctx.beginPath();
    ctx.arc(center.x, center.y, currentRadius * scale, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    if (isInsideGeofence) {
      ctx.strokeStyle = '#10B981';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    } else {
      ctx.strokeStyle = '#EF4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    }
    ctx.fill();
    ctx.stroke();

    // Draw geofence anchor center
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#1C2B3C';
    ctx.fill();

    // Draw path breadcrumbs line
    const matchVehicle = selectedRental ? vehicles.find(v => v.id === selectedRental.vehicle_id) : null;
    const cLat = matchVehicle?.geofence_center_lat !== undefined ? Number(matchVehicle.geofence_center_lat) : 21.028511;
    const cLng = matchVehicle?.geofence_center_lng !== undefined ? Number(matchVehicle.geofence_center_lng) : 105.804817;

    if (trail.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(28, 43, 60, 0.4)';
      ctx.setLineDash([4, 4]);

      trail.forEach((pos, idx) => {
        const dx = (pos.lng - cLng) * 111320;
        const dy = (pos.lat - cLat) * 111320;
        const px = center.x + dx * scale;
        const py = center.y - dy * scale;

        if (idx === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw path points
    trail.forEach((pos, idx) => {
      if (idx === trail.length - 1) return;
      const dx = (pos.lng - cLng) * 111320;
      const dy = (pos.lat - cLat) * 111320;
      const px = center.x + dx * scale;
      const py = center.y - dy * scale;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#94A3B8';
      ctx.fill();
    });

    // Draw active cursor
    const activeDx = (lng - cLng) * 111320;
    const activeDy = (lat - cLat) * 111320;
    const activePx = center.x + activeDx * scale;
    const activePy = center.y - activeDy * scale;

    // Draw pulsating signal
    const pulseRad = 8 + pulseTime * 1.5;
    ctx.beginPath();
    ctx.arc(activePx, activePy, pulseRad, 0, 2 * Math.PI);
    ctx.strokeStyle = isInsideGeofence ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw cursor center dot
    ctx.beginPath();
    ctx.arc(activePx, activePy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = isInsideGeofence ? '#10B981' : '#EF4444';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Scale label text overlay
    ctx.fillStyle = 'rgba(28, 43, 60, 0.8)';
    ctx.fillRect(8, height - 24, 120, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(`Scale: ${currentRadius}m radius`, 12, height - 13);

  }, [trail, pulseTime, lat, lng, selectedRental, vehicles, isInsideGeofence, selectedVehicle]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#E0DDD5]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#1C2B3C] flex items-center gap-2.5">
          <Cpu className="h-4 w-4 text-[#1C2B3C]" />
          IoT OBD-II Telematics Virtual Board
        </h2>
        <span className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">Simulated Hardware Node</span>
      </div>

      {!selectedRentalId ? (
        <div className="rounded-sm border border-dashed border-[#DDDCD4] bg-[#EAE8E1]/30 p-12 text-center text-[#718096] text-xs font-semibold">
          No active rentals found. Rent an asset from the Marketplace, then return to stream telematic signals.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Column */}
          <div className="space-y-6 rounded-sm border border-[#E0DDD5] bg-white p-6 sm:p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] flex items-center gap-2 pb-3 border-b border-[#F2F1EC]">
              <Orbit className="h-4 w-4 text-[#1C2B3C]" /> TELEMETRY MODULE
            </h3>

            {/* Select rental */}
            <div>
              <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-2">ACTIVE LEASE PROFILE</label>
              <select
                value={selectedRentalId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedRentalId(id);
                  const rent = rentals.find(r => r.id === id);
                  if (rent) setOdometer(Number(rent.current_odometer || rent.start_odometer || 100000));
                }}
                className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-bold focus:outline-none form-focus-ring"
              >
                {rentals.map(r => {
                  const v = vehicles.find(veh => veh.id === r.vehicle_id);
                  return (
                    <option key={r.id} value={r.id}>
                      Lease #{r.id} - {v?.model}
                    </option>
                  );
                })}
              </select>
              <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 Select the active lease profile to simulate real-time driving logs.</span>
            </div>

            {/* Vehicle Details */}
            {selectedVehicle && (
              <div className="rounded-sm bg-[#F2F1EC] p-4 border border-[#DDDCD4] text-[10px] uppercase font-bold space-y-2">
                <div className="flex justify-between text-[#718096]">
                  <span>Speed Limit:</span>
                  <span className="text-[#1C2B3C] font-extrabold">{selectedVehicle.speed_limit_kmh} km/h</span>
                </div>
                <div className="flex justify-between text-[#718096]">
                  <span>Distance Rate:</span>
                  <span className="text-[#1C2B3C] font-extrabold">{selectedVehicle.rate_per_km} USDC/km</span>
                </div>
              </div>
            )}

            {/* Speed controller */}
            <div>
              <div className="flex justify-between items-center text-[9px] font-bold tracking-widest text-[#718096] mb-2">
                <span>SPEEDOMETER</span>
                <span className="text-[#1C2B3C] font-black">{speed} km/h</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSpeed(prev => Math.max(0, prev - 10))}
                  className="w-11 h-11 flex items-center justify-center rounded-sm bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[#1C2B3C] font-black border border-[#DDDCD4] text-xs transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  -10
                </button>
                <input
                  type="range"
                  min="0"
                  max="160"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="flex-1 h-11 accent-[#1C2B3C] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSpeed(prev => Math.min(160, prev + 10))}
                  className="w-11 h-11 flex items-center justify-center rounded-sm bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[#1C2B3C] font-black border border-[#DDDCD4] text-xs transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  +10
                </button>
              </div>
              <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 Exceeding the vehicle speed limit registers speeding violations on-chain.</span>
            </div>

            {/* Odometer Manual Increment */}
            <div>
              <div className="flex justify-between items-center text-[9px] font-bold tracking-widest text-[#718096] mb-2">
                <span>ODOMETER</span>
                <span className="text-[#1C2B3C] font-black">{(odometer / 1000).toFixed(3)} km</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOdometer(prev => prev + 1000);
                    sendTelemetryUpdate(1000);
                  }}
                  className="flex-1 h-11 rounded-sm bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[10px] font-bold uppercase tracking-wider text-[#1C2B3C] border border-[#DDDCD4] transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  +1 km (Drive)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOdometer(prev => prev + 5000);
                    sendTelemetryUpdate(5000);
                  }}
                  className="flex-1 h-11 rounded-sm bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[10px] font-bold uppercase tracking-wider text-[#1C2B3C] border border-[#DDDCD4] transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  +5 km (Drive)
                </button>
              </div>
            </div>

            {/* Geofence Simulator Control */}
            <div>
              <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-2">ROUTE SIMULATION CHEAT</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLat(centerLat);
                    setLng(centerLng);
                    setTimeout(() => sendTelemetryUpdate(0), 100);
                  }}
                  className="flex-1 h-11 bg-[#F2F1EC] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 rounded-sm text-[9px] font-bold uppercase tracking-wider text-[#1C2B3C] border border-[#DDDCD4] transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  Reset to Center
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLat(centerLat + 0.1);
                    setLng(centerLng + 0.1);
                    setTimeout(() => sendTelemetryUpdate(0), 100);
                  }}
                  className="flex-1 h-11 bg-[#F2F1EC] hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-sm text-[9px] font-bold uppercase tracking-wider text-[#1C2B3C] border border-[#DDDCD4] transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  Exit Geofence
                </button>
              </div>
            </div>

            {/* Switches */}
            <div className="border-t border-[#F2F1EC] pt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsDriving(!isDriving)}
                className={`flex-1 h-12 rounded-sm font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  isDriving
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#1C2B3C] text-white hover:bg-[#111A24]'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {isDriving ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" /> STOP ROUTE
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" /> START ROUTE
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={triggerImpact}
                disabled={crashSensor}
                className="flex-1 h-12 rounded-sm bg-[#EAE8E1] text-[#1C2B3C] hover:bg-[#DDDCD4] transition-all font-bold text-xs tracking-widest uppercase border border-[#DDDCD4] flex items-center justify-center gap-2"
                style={{ touchAction: 'manipulation' }}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> IMPACT CRASH
              </button>
            </div>
          </div>

          {/* Real-time Display Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 text-center">
                <Gauge className="h-4.5 w-4.5 text-[#1C2B3C] mx-auto mb-2" />
                <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider">LIVE SPEED</span>
                <span className="text-base font-extrabold text-[#1C2B3C]">{speed} km/h</span>
              </div>
              <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 text-center">
                <MapPin className="h-4.5 w-4.5 text-[#1C2B3C] mx-auto mb-2" />
                <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider">LATITUDE</span>
                <span className="text-base font-extrabold text-[#1C2B3C]">{lat.toFixed(5)}</span>
              </div>
              <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 text-center">
                <MapPin className="h-4.5 w-4.5 text-[#1C2B3C] mx-auto mb-2" />
                <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider">LONGITUDE</span>
                <span className="text-base font-extrabold text-[#1C2B3C]">{lng.toFixed(5)}</span>
              </div>
              <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 text-center">
                <ShieldCheck className="h-4.5 w-4.5 text-[#1C2B3C] mx-auto mb-2" />
                <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider">CRASH SENSOR</span>
                <span className={`text-base font-extrabold ${crashSensor ? 'text-red-600 animate-pulse' : 'text-[#3E5062]'}`}>
                  {crashSensor ? 'TRIGGERED' : 'SECURE'}
                </span>
              </div>
              <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 text-center">
                <Orbit className="h-4.5 w-4.5 text-[#1C2B3C] mx-auto mb-2" />
                <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider">GEOFENCE</span>
                <span className={`text-base font-extrabold ${isInsideGeofence ? 'text-emerald-600' : 'text-red-600 animate-pulse'}`}>
                  {isInsideGeofence ? 'INSIDE' : 'OUTSIDE'}
                </span>
              </div>
            </div>

            {/* Retro Radar Route Canvas */}
            <div className="rounded-sm border border-[#E0DDD5] bg-white p-5 shadow-sm space-y-3.5">
              <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest pb-1 border-b border-[#F2F1EC]">
                REAL-TIME TELEMETRICS ROUTE TRACKER
              </span>
              <div className="flex justify-center items-center bg-[#F9F9F6] border border-[#DDDCD4] rounded-sm p-4 relative overflow-hidden w-full max-w-full aspect-[480/280]">
                <canvas 
                  ref={canvasRef} 
                  width={480} 
                  height={280} 
                  className="max-w-full block bg-white border border-[#E2E8F0] shadow-sm rounded-sm"
                />
              </div>
            </div>

            {/* Geofence Info Overlay */}
            {selectedVehicle && (
              <div className="rounded-sm bg-white border border-[#DDDCD4] p-5 shadow-sm text-xs font-semibold text-[#1C2B3C] space-y-2">
                <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest pb-1 border-b border-[#F2F1EC]">
                  ACTIVE GEOFENCE DETAILS
                </span>
                <div className="flex flex-col sm:flex-row sm:justify-between uppercase gap-1 sm:gap-2">
                  <span className="text-[#718096]">Boundary Center:</span>
                  <span className="font-mono text-[10px] sm:text-xs text-right sm:text-left">{centerLat.toFixed(6)}, {centerLng.toFixed(6)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between uppercase gap-1 sm:gap-2">
                  <span className="text-[#718096]">Permitted Radius:</span>
                  <span>{radiusMeters} meters</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between uppercase gap-1 sm:gap-2">
                  <span className="text-[#718096]">Distance to Center:</span>
                  <span className={`${isInsideGeofence ? 'text-emerald-600' : 'text-red-600 font-extrabold animate-pulse'} text-right sm:text-left`}>
                    {currentDistance.toFixed(0)} meters
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between uppercase gap-1 sm:gap-2 border-t border-[#F2F1EC] pt-2">
                  <span className="text-[#718096]">Out-Of-Bounds Penalty:</span>
                  <span className="text-red-600 font-extrabold text-right sm:text-left">{violationPenalty} USDC per report</span>
                </div>
              </div>
            )}

            {/* Circle Gateway Nanopayments Dashboard */}
            <div className="rounded-sm bg-white border border-[#DDDCD4] p-5 shadow-sm text-xs font-semibold text-[#1C2B3C] space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#F2F1EC]">
                <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest">
                  Circle Gateway Nanopayments (x402 Micro-Billing)
                </span>
                <span className="bg-[#1C2B3C] text-white text-[8px] font-mono px-2 py-0.5 rounded-sm uppercase tracking-widest font-extrabold animate-pulse">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#F2F1EC] p-3 rounded-sm border border-[#DDDCD4]">
                  <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider mb-1">Renter Gateway Escrow</span>
                  <span className="text-sm font-extrabold text-[#1C2B3C]">{(gatewayDeposit).toFixed(4)} USDC</span>
                </div>
                <div className="bg-[#F2F1EC] p-3 rounded-sm border border-[#DDDCD4]">
                  <span className="block text-[8px] text-[#718096] uppercase font-bold tracking-wider mb-1">Streamed Nanopayments</span>
                  <span className="text-sm font-extrabold text-[#1C2B3C] font-mono">{(nanopaymentsAccumulated).toFixed(6)} USDC</span>
                </div>
                <div className="bg-[#F2F1EC] p-3 rounded-sm border border-[#DDDCD4] relative overflow-hidden">
                  <span className="block text-[8px] text-emerald-800 uppercase font-bold tracking-wider mb-1">Gas Fees Saved</span>
                  <span className="text-sm font-extrabold text-emerald-700">{(gasSaved).toFixed(4)} USDC</span>
                  <span className="block text-[7.5px] text-[#718096] font-mono mt-0.5">({updatesCount - settlementsCount} on-chain txs skipped)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center text-[9px] text-[#718096] border-t border-[#F2F1EC] pt-3">
                <div className="flex flex-col gap-0.5">
                  <span>Batch Status: {updatesCount % 5}/5 to auto-settle</span>
                  <span>Total Updates: {updatesCount} · Total Settled: {settlementsCount}</span>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedRentalId) return;
                    setSubmitting(true);
                    try {
                      const res = await fetch('/api/nanopay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'settle', rentalId: selectedRentalId }),
                      });
                      const data = await res.json();
                      if (data.success && data.state) {
                        setGatewayDeposit(data.state.gatewayDeposit);
                        setNanopaymentsAccumulated(data.state.nanopaymentsAccumulated);
                        setGasSaved(data.state.gasSavedUsdc);
                        setUpdatesCount(data.state.telemetryUpdateCount);
                        setSettlementsCount(data.state.onchainSettlementCount);
                        if (data.txHash) setLastTxHash(data.txHash);
                        
                        const timestamp = new Date().toLocaleTimeString();
                        setLogs(prev => [`[${timestamp}] ⛓️ MANUAL ON-CHAIN BATCH SETTLED`, ...prev.slice(0, 15)]);
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting || updatesCount === 0}
                  className="w-full sm:w-auto text-center rounded-sm border border-[#DDDCD4] bg-white hover:bg-[#F2F1EC] px-3 py-2 text-[8.5px] font-black uppercase text-[#1C2B3C] tracking-widest transition-all"
                >
                  Settle Batch On-Chain
                </button>
              </div>
            </div>

            {/* Oracle/Blockchain updates */}
            {lastTxHash && (
              <div className="rounded-sm bg-white border border-[#DDDCD4] p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="h-8 w-8 rounded-sm bg-[#1C2B3C] flex items-center justify-center text-white">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#1C2B3C] font-black uppercase tracking-wider block">ON-CHAIN ORACLE RECEIPT DISPATCHED</span>
                    <span className="text-[10px] text-[#718096] font-mono">{lastTxHash}</span>
                  </div>
                </div>
                <a
                  href={`https://testnet.arcscan.app/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm bg-[#1C2B3C] px-3.5 py-2 text-[10px] font-bold text-white hover:bg-[#111A24] transition-all uppercase tracking-widest shadow-sm"
                >
                  VIEW ARCSCAN
                </a>
              </div>
            )}

            {/* Telemetry Logs Panel */}
            <div className="rounded-sm border border-[#E0DDD5] bg-white p-6 flex-1 shadow-sm">
              <h4 className="text-[10px] font-bold text-[#1C2B3C] mb-4 font-mono uppercase tracking-widest">OBD-II INCOMING STREAM</h4>
              <div className="h-64 overflow-y-auto rounded-sm bg-[#F2F1EC] p-4 border border-[#DDDCD4] font-mono text-[10px] text-[#4A5568] space-y-2.5 divide-y divide-[#E0DDD5]/50">
                {logs.length === 0 ? (
                  <div className="text-center text-[#718096] py-24 uppercase font-bold tracking-wider">No active telemetry streams. Start driving to initialize coords.</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="pt-2.5 first:pt-0 first:text-[#1C2B3C] first:font-bold">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
