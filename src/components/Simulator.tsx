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
}

interface Vehicle {
  id: number;
  model: string;
  speed_limit_kmh: number;
  rate_per_km: number;
}

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

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const [rentalsRes, vehiclesRes] = await Promise.all([
        fetch('/api/rentals'),
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
        let logMsg = `[${timestamp}] Lat:${telemetryBody.latitude}, Lng:${telemetryBody.longitude} | Speed: ${telemetryBody.speed} km/h | Odometer: ${(telemetryBody.odometer / 1000).toFixed(3)} km`;
        
        if (selectedVehicle && speed > selectedVehicle.speed_limit_kmh) {
          logMsg += ` ⚠️ SPEED LIMIT BREACHED (-${selectedVehicle.rate_per_km} USDC)`;
        }
        
        if (crashSensor) {
          logMsg += ` 💥 CRASH DETECTED! Escrow Locked.`;
          setIsDriving(false);
        }

        setLogs(prev => [logMsg, ...prev.slice(0, 15)]);
        
        if (data.onChainTxHash) {
          setLastTxHash(data.onChainTxHash);
        }

        if (selectedRental) {
          selectedRental.current_odometer = telemetryBody.odometer;
          selectedRental.distance_charges_accrued = data.rental.distance_charges_accrued;
          selectedRental.speed_penalties_accrued = data.rental.speed_penalties_accrued;
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
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
          <div className="space-y-6 rounded-sm border border-[#E0DDD5] bg-white p-8">
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
                className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-bold focus:outline-none"
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
              <input
                type="range"
                min="0"
                max="160"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-[#1C2B3C] cursor-pointer"
              />
            </div>

            {/* Odometer Manual Increment */}
            <div>
              <div className="flex justify-between items-center text-[9px] font-bold tracking-widest text-[#718096] mb-2">
                <span>ODOMETER</span>
                <span className="text-[#1C2B3C] font-black">{(odometer / 1000).toFixed(3)} km</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOdometer(prev => prev + 1000);
                    sendTelemetryUpdate(1000);
                  }}
                  className="flex-1 py-2.5 rounded-sm bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[10px] font-bold uppercase tracking-wider text-[#1C2B3C] border border-[#DDDCD4] transition-all"
                >
                  +1 km (Drive)
                </button>
                <button
                  onClick={() => {
                    setOdometer(prev => prev + 5000);
                    sendTelemetryUpdate(5000);
                  }}
                  className="flex-1 py-2.5 rounded-sm bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[10px] font-bold uppercase tracking-wider text-[#1C2B3C] border border-[#DDDCD4] transition-all"
                >
                  +5 km (Drive)
                </button>
              </div>
            </div>

            {/* Switches */}
            <div className="border-t border-[#F2F1EC] pt-5 flex gap-3">
              <button
                onClick={() => setIsDriving(!isDriving)}
                className={`flex-1 py-3.5 rounded-sm font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  isDriving
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#1C2B3C] text-white hover:bg-[#111A24]'
                }`}
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
                onClick={triggerImpact}
                disabled={crashSensor}
                className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] text-[#1C2B3C] hover:bg-[#DDDCD4] transition-all font-bold text-xs tracking-widest uppercase border border-[#DDDCD4] flex items-center justify-center gap-2"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> IMPACT CRASH
              </button>
            </div>
          </div>

          {/* Real-time Display Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
