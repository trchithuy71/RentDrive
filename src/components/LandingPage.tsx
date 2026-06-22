'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Coins, 
  Landmark, 
  Gauge, 
  MapPin, 
  Zap, 
  ExternalLink, 
  HelpCircle, 
  AlertTriangle,
  Play, 
  RotateCcw,
  Activity,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import RelatedNavigation from './RelatedNavigation';

interface LandingPageProps {
  onLaunchApp: () => void;
  onNavigate: (view: string) => void;
}

export default function LandingPage({ onLaunchApp, onNavigate }: LandingPageProps) {
  // Live OBD-II Sandbox State for Landing Page Showroom
  const [simSpeed, setSimSpeed] = useState(0);
  const [simOdometer, setSimOdometer] = useState(120.4); // in km
  const [simEscrow, setSimEscrow] = useState(150.00); // in USDC
  const [simStatus, setSimStatus] = useState<'idle' | 'driving' | 'speeding' | 'crashed'>('idle');
  const [simAlert, setSimAlert] = useState<string | null>(null);

  // Auto-drive simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simStatus === 'driving' || simStatus === 'speeding') {
      interval = setInterval(() => {
        // Increment odometer
        setSimOdometer(prev => parseFloat((prev + 0.05).toFixed(2)));
        
        // Micro-billing deduction (0.2 USDC per 50 meters / tick)
        setSimEscrow(prev => {
          const nextVal = prev - 0.25;
          return nextVal > 0 ? parseFloat(nextVal.toFixed(2)) : 0;
        });

        // Trigger warning if speed goes too high
        if (simSpeed > 100) {
          setSimStatus('speeding');
          setSimAlert('SPEED LIMIT EXCEEDED: PENALTY APPLIED (-5.00 USDC)');
          setSimEscrow(prev => {
            const nextVal = prev - 5.00;
            return nextVal > 0 ? parseFloat(nextVal.toFixed(2)) : 0;
          });
        } else {
          setSimStatus('driving');
          setSimAlert(null);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [simStatus, simSpeed]);

  const handleAccelerate = () => {
    if (simStatus === 'crashed') return;
    setSimSpeed(prev => {
      const nextSpeed = prev + 25;
      if (nextSpeed > 120) {
        return 120;
      }
      return nextSpeed;
    });
    setSimStatus(simSpeed + 25 > 100 ? 'speeding' : 'driving');
  };

  const handleBrake = () => {
    if (simStatus === 'crashed') return;
    setSimSpeed(prev => {
      const nextSpeed = prev - 30;
      if (nextSpeed <= 0) {
        setSimStatus('idle');
        return 0;
      }
      return nextSpeed;
    });
    if (simSpeed - 30 <= 100) {
      setSimAlert(null);
    }
  };

  const handleSimulateCrash = () => {
    setSimSpeed(0);
    setSimStatus('crashed');
    setSimAlert('CRASH DETECTED: SMART CONTRACT ESCROW FROZEN');
  };

  const handleResetSim = () => {
    setSimSpeed(0);
    setSimOdometer(120.4);
    setSimEscrow(150.00);
    setSimStatus('idle');
    setSimAlert(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-4 space-y-24">
      {/* 1. Hero Section */}
      <section className="relative pt-10 pb-16 text-center">
        {/* Subtle grid background blur */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-10">
          <div className="h-[400px] w-[600px] rounded-full bg-radial from-[#1C2B3C] to-transparent blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCDAD0] bg-white px-4 py-1.5 text-[10px] font-black tracking-widest text-[#1C2B3C] uppercase shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            STABLECOINS COMMERCE STACK CHALLENGE
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#1C2B3C] leading-[1.05] uppercase">
            P2P VEHICLE RENTALS <br />
            <span className="text-[#5A6573] font-normal italic tracking-normal lowercase block mt-2">
              secured by real-time telematics escrows
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="mt-6 text-sm md:text-base text-[#4A5568] leading-relaxed max-w-2xl mx-auto font-medium">
            Lock safety deposits in automated smart contract vaults on Arc Network. 
            RentDrive processes distance-based micro-billing and safety policies autonomously 
            using connected OBD-II telematics data.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={onLaunchApp}
              className="px-8 py-4 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all duration-300 border border-[#1C2B3C] shadow-md flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              LAUNCH APP CONSOLE <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('docs')}
              className="px-8 py-4 rounded-sm bg-white text-[#1C2B3C] text-xs font-bold tracking-widest uppercase hover:bg-[#F2F1EC] transition-all duration-300 border border-[#DDDCD4] flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              READ DEVELOPER DOCS
            </button>
          </div>
        </div>

        {/* Interactive OBD-II Sandbox Mockup */}
        <div className="mt-16 rounded-sm border border-[#DDDCD4] bg-white p-6 md:p-8 max-w-4xl mx-auto shadow-xl relative overflow-hidden text-left">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1C2B3C] via-[#3E5062] to-[#1C2B3C]" />
          
          {/* Header controls inside mockup */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F2F1EC] mb-6 gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="text-[10px] font-mono text-[#718096] uppercase font-bold tracking-wider ml-2">
                OBD-II LIVE TELEMETRY SHOWROOM
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm border uppercase font-bold ${
                simStatus === 'crashed' 
                  ? 'text-red-700 bg-red-50 border-red-200' 
                  : 'text-green-700 bg-green-50 border-green-200'
              }`}>
                {simStatus === 'crashed' ? 'ESCROW FROZEN' : 'ORACLE CONNECTED'}
              </span>
              <button 
                onClick={handleResetSim}
                className="p-1 rounded hover:bg-[#F2F1EC] transition-colors"
                title="Reset Simulation"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#5A6573]" />
              </button>
            </div>
          </div>

          {/* Alert Banner */}
          {simAlert && (
            <div className={`mb-6 p-3.5 rounded-sm border text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 animate-pulse ${
              simStatus === 'crashed' 
                ? 'bg-red-50 text-red-800 border-red-200' 
                : 'bg-yellow-50 text-yellow-800 border-yellow-200'
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{simAlert}</span>
            </div>
          )}

          {/* Live Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#F2F1EC] p-5 border border-[#E0DDD5] rounded-sm transition-all duration-300">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">
                ON-CHAIN ESCROW BALANCE
              </span>
              <div className="text-3xl font-black text-[#1C2B3C] tracking-tight flex items-baseline gap-1">
                {simEscrow.toFixed(2)}
                <span className="text-[10px] text-[#5A6573] font-bold uppercase">USDC</span>
              </div>
              <span className="text-[9px] text-[#5A6573] font-bold block mt-1.5 uppercase flex items-center gap-1">
                <Zap className="h-3 w-3 text-green-700 fill-current" /> Gas Sponsor Active
              </span>
            </div>

            <div className="bg-[#F2F1EC] p-5 border border-[#E0DDD5] rounded-sm transition-all duration-300">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">
                SPEED (LIMIT: 100 KM/H)
              </span>
              <div className="text-3xl font-black text-[#1C2B3C] tracking-tight flex items-baseline gap-1">
                {simSpeed}
                <span className="text-[10px] text-[#5A6573] font-bold uppercase">km/h</span>
              </div>
              <span className={`text-[9px] font-bold block mt-1.5 uppercase ${
                simStatus === 'speeding' ? 'text-red-600' : 'text-green-700'
              }`}>
                {simSpeed === 0 ? '· STANDBY' : simSpeed > 100 ? '· SPEED VIOLATION' : '· SAFE OPERATION'}
              </span>
            </div>

            <div className="bg-[#F2F1EC] p-5 border border-[#E0DDD5] rounded-sm transition-all duration-300">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">
                ODOMETER (DISTANCE CALC)
              </span>
              <div className="text-3xl font-black text-[#1C2B3C] tracking-tight flex items-baseline gap-1">
                {simOdometer.toFixed(2)}
                <span className="text-[10px] text-[#5A6573] font-bold uppercase">km</span>
              </div>
              <span className="text-[9px] text-[#5A6573] font-bold block mt-1.5 uppercase">
                {simStatus === 'driving' || simStatus === 'speeding' ? '· STREAMING DELTA' : '· RECORDED'}
              </span>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-[#DDDCD4] bg-[#F2F1EC]/30 rounded-sm">
            <div className="text-xs font-semibold text-[#5A6573]">
              INTERACTION RADAR:
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAccelerate}
                disabled={simStatus === 'crashed'}
                className="px-4 py-2.5 bg-[#1C2B3C] hover:bg-[#111A24] text-white text-[10px] font-bold tracking-wider uppercase rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Accelerate
              </button>
              <button
                onClick={handleBrake}
                disabled={simStatus === 'crashed' || simSpeed === 0}
                className="px-4 py-2.5 bg-white border border-[#DDDCD4] text-[#1C2B3C] hover:bg-[#F2F1EC] text-[10px] font-bold tracking-wider uppercase rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Brake
              </button>
              <button
                onClick={handleSimulateCrash}
                disabled={simStatus === 'crashed'}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold tracking-wider uppercase rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Trigger Crash
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem & Solution Section */}
      <section className="py-8 border-t border-[#E0DDD5] grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 space-y-4">
          <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">
            THE TRUST BREAKDOWN
          </span>
          <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide leading-tight">
            TRADITIONAL SHARING REQUIRES DISSOLVING FRICTION.
          </h2>
          <p className="text-[#5A6573] text-xs font-semibold leading-relaxed">
            Legacy P2P rentals demand bloated intermediaries, arbitrary security deposits, and manual claims processes. Insurance disputes drag on for weeks while funds sit locked in opaque custody models.
          </p>
          <div className="pt-2">
            <button 
              onClick={() => onNavigate('about')} 
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1C2B3C] hover:text-[#5A6573] transition-colors"
            >
              Our Product Vision <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-[#E0DDD5] rounded-sm hover:shadow-md transition-all duration-300">
            <div className="h-9 w-9 bg-[#F2F1EC] text-[#1C2B3C] border border-[#DDDCD4] flex items-center justify-center rounded-sm mb-4">
              <Coins className="h-4.5 w-4.5" />
            </div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest mb-2">
              Collateralized Escrows
            </h4>
            <p className="text-[#5A6573] text-[11px] leading-relaxed font-medium">
              Security deposits are locked transparently in public smart contract vaults. Owner or renter cannot withdraw without automated telematics validation.
            </p>
          </div>

          <div className="p-6 bg-white border border-[#E0DDD5] rounded-sm hover:shadow-md transition-all duration-300">
            <div className="h-9 w-9 bg-[#F2F1EC] text-[#1C2B3C] border border-[#DDDCD4] flex items-center justify-center rounded-sm mb-4">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest mb-2">
              Hardware Telematics
            </h4>
            <p className="text-[#5A6573] text-[11px] leading-relaxed font-medium">
              OBD-II IoT sensors log metrics (speed, mileage, impact spikes) straight to the blockchain. No centralized ledger to manipulate or edit.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Features Section */}
      <section className="py-8 border-t border-[#E0DDD5]">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-2">
          <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">
            CORE DEPIN FEATURES
          </span>
          <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide">
            AUTOMATED DRIVING ENFORCEMENT
          </h2>
          <p className="text-xs text-[#5A6573] font-semibold max-w-xl mx-auto">
            Harnessing blockchain and IoT sensors to remove centralized mediators and manage rental risks autonomously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-[#E0DDD5] p-8 rounded-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 bg-[#F2F1EC] text-[#1C2B3C] flex items-center justify-center rounded-sm mb-6 border border-[#DDDCD4]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-widest mb-3">
              1. Crash-Sensor Freeze
            </h3>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium">
              High g-force detection switches the rental contract state to "Disputed" instantaneously, freezing escrow withdrawals until resolving telemetry is checked.
            </p>
          </div>

          <div className="bg-white border border-[#E0DDD5] p-8 rounded-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 bg-[#F2F1EC] text-[#1C2B3C] flex items-center justify-center rounded-sm mb-6 border border-[#DDDCD4]">
              <Gauge className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-widest mb-3">
              2. Per-KM Micro-Billing
            </h3>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium">
              Real-time odometer deltas automatically calculate exact distance pricing. Escrow funds stream directly to the owner, settling micro-dues per kilometer.
            </p>
          </div>

          <div className="bg-white border border-[#E0DDD5] p-8 rounded-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 bg-[#F2F1EC] text-[#1C2B3C] flex items-center justify-center rounded-sm mb-6 border border-[#DDDCD4]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-widest mb-3">
              3. Speed Violation Rules
            </h3>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium">
              Vehicles track speed limits. Exceeding owner-defined speeds triggers automated penalty deductions directly from the safety escrow balance.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="py-8 border-t border-[#E0DDD5]">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-2">
          <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide">
            4-STEP DEPLOYMENT FLOW
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3 relative">
            <div className="text-5xl font-black text-[#E0DDD5] font-mono">01</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Connect Wallet</h4>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium pr-4">
              Integrate your Web3 wallet address. Gas operations are sponsored automatically using our custom stablecoin gas-station.
            </p>
          </div>

          <div className="space-y-3 relative">
            <div className="text-5xl font-black text-[#E0DDD5] font-mono">02</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Lock Escrow Deposit</h4>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium pr-4">
              Review vehicle inventory in the marketplace, confirm rental rules, and lock your USDC deposit in the Solidity smart contract.
            </p>
          </div>

          <div className="space-y-3 relative">
            <div className="text-5xl font-black text-[#E0DDD5] font-mono">03</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Drive & Stream OBD</h4>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium pr-4">
              OBD-II hardware coordinates latitude/longitude, mileage metrics, and speed signals onto Arc Network validators.
            </p>
          </div>

          <div className="space-y-3 relative">
            <div className="text-5xl font-black text-[#E0DDD5] font-mono">04</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Auto Settlement</h4>
            <p className="text-[#5A6573] text-xs leading-relaxed font-medium pr-4">
              Check-out locks in distance traveled. Funds partition instantly: rental costs disburse to the car owner, and remaining deposit returns to you.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Trust / Tech Stack Section */}
      <section className="py-10 border-t border-[#E0DDD5] text-center space-y-6">
        <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">
          ENGINEERING ARCHITECTURE
        </span>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 items-center opacity-75 max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#1C2B3C]" />
            <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">ARC TESTNET</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-[#1C2B3C]" />
            <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">CIRCLE APP-KIT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft className="h-4 w-4 text-[#1C2B3C]" />
            <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">VIEM ADAPTER</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#1C2B3C]" />
            <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">RAINBOWKIT</span>
          </div>
        </div>
      </section>

      {/* 6. Final Call-to-Action Banner */}
      <section className="my-6 rounded-sm border border-[#DDDCD4] bg-[#EAE8E1] p-10 md:p-14 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-radial from-[#1C2B3C]/5 to-transparent blur-2xl -z-10" />
        <h3 className="text-2xl md:text-3xl font-black text-[#1C2B3C] uppercase tracking-wider mb-4">
          DEPLOY A VIRTUAL TELEMETRY OBD-II NODE
        </h3>
        <p className="text-[#4A5568] text-xs font-semibold max-w-xl mx-auto mb-8 leading-relaxed">
          Test the live escrow settlement flow. Accelerate vehicle telemetry, trigger simulated collision events, or monitor gasless RPC relays inside our interactive sandbox.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={onLaunchApp}
            className="px-8 py-4 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-md hover:scale-[1.02]"
          >
            CONFIRM & LAUNCH CONSOLE
          </button>
          <button
            onClick={() => onNavigate('faq')}
            className="px-8 py-4 rounded-sm bg-white text-[#1C2B3C] text-xs font-bold tracking-widest uppercase hover:bg-[#F2F1EC] transition-all border border-[#DDDCD4] hover:scale-[1.02]"
          >
            VIEW SYSTEM FAQS
          </button>
        </div>
      </section>

      {/* Discovery Layer */}
      <RelatedNavigation currentView="landing" />
    </div>
  );
}
