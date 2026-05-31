'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, Cpu, Coins, Landmark, Gauge, MapPin, Zap, ExternalLink, HelpCircle } from 'lucide-react';

interface LandingPageProps {
  onLaunchApp: () => void;
  onNavigate: (view: string) => void;
}

export default function LandingPage({ onLaunchApp, onNavigate }: LandingPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-4">
      {/* 1. Hero Section */}
      <section className="relative py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#1C2B3C] px-3.5 py-1.5 text-[9px] font-bold tracking-widest text-[#F2F1EC] uppercase mb-8">
            <ShieldCheck className="h-3.5 w-3.5" /> STABLECOINS COMMERCE STACK CHALLENGE
          </span>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#1C2B3C] leading-[0.95] uppercase font-sans">
            DECENTRALIZED P2P VEHICLE RENTALS <br />
            <span className="text-[#5A6573] font-normal italic tracking-normal lowercase">secured by real-time telematics</span>
          </h1>
          
          {/* Subheadline */}
          <p className="mt-8 text-sm md:text-base text-[#4A5568] leading-relaxed max-w-2xl mx-auto font-medium">
            Lock safety deposits in automated smart contract escrows on the Arc Network. RentDrive processes per-kilometer micro-billing and speed limit policies autonomously using connected OBD-II telematics data.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={onLaunchApp}
              className="px-8 py-4 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-md flex items-center justify-center gap-2"
            >
              LAUNCH APP CONSOLE <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('docs')}
              className="px-8 py-4 rounded-sm bg-white text-[#1C2B3C] text-xs font-bold tracking-widest uppercase hover:bg-[#EAE8E1] transition-all border border-[#DDDCD4]"
            >
              READ DEVELOPER DOCS
            </button>
          </div>
        </div>

        {/* Interactive Product Preview Card */}
        <div className="mt-16 rounded-sm border border-[#DDDCD4] bg-white p-6 md:p-8 max-w-5xl mx-auto shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#1C2B3C]" />
          <div className="flex items-center justify-between pb-4 border-b border-[#F2F1EC] mb-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="text-[10px] font-mono text-[#718096] uppercase font-bold tracking-wider ml-2">RENTDRIVE TELEMATICS SIMULATION VIEW</span>
            </div>
            <span className="text-[9px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded-sm border border-green-200 uppercase font-bold">ORACLE CONNECTED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F2F1EC] p-5 border border-[#E0DDD5] text-left">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1">ACTIVE ESCROW STATUS</span>
              <div className="text-2xl font-black text-[#1C2B3C] tracking-tight">200.00 USDC</div>
              <span className="text-[9px] text-[#5A6573] font-bold block mt-1 uppercase">USDC Gas Sponsorship Active</span>
            </div>
            <div className="bg-[#F2F1EC] p-5 border border-[#E0DDD5] text-left">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1">VIRTUAL SPEEDOMETER</span>
              <div className="text-2xl font-black text-[#1C2B3C] tracking-tight">85 km/h</div>
              <span className="text-[9px] text-[#5A6573] font-bold block mt-1 uppercase">LIMIT: 100 km/h · SECURE</span>
            </div>
            <div className="bg-[#F2F1EC] p-5 border border-[#E0DDD5] text-left">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1">TELEMETRY FEE DELTA</span>
              <div className="text-2xl font-black text-[#1C2B3C] tracking-tight">0.50 USDC / km</div>
              <span className="text-[9px] text-green-700 font-bold block mt-1 uppercase">Micro-billing stream active</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem -> Solution */}
      <section className="py-16 border-t border-[#E0DDD5] grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block mb-2">THE P2P SHIFT</span>
          <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide leading-tight">
            TRADITIONAL RENTALS RETAIN FRICTION. WE AUTOMATE CUSTODY.
          </h2>
          <p className="mt-4 text-[#5A6573] text-xs font-semibold leading-relaxed">
            Legacy rental models demand expensive third-party brokerage, physical deposit checks, and manual claim reports in the event of a collision. Insurance disputes take weeks to process, keeping user funds locked in high-interest accounts indefinitely.
          </p>
        </div>
        <div className="space-y-4">
          <div className="p-6 bg-white border border-[#E0DDD5]">
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
              <Coins className="h-4.5 w-4.5 text-[#1C2B3C]" /> Collateralized Escrows
            </h4>
            <p className="text-[#5A6573] text-[11px] leading-relaxed">
              Deposits are locked transparently in Solidity-audited contracts. Administration and owners cannot withdraw without telemetry verification or mutual dispute signatures.
            </p>
          </div>
          <div className="p-6 bg-white border border-[#E0DDD5]">
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-[#1C2B3C]" /> Telematics Enforcement
            </h4>
            <p className="text-[#5A6573] text-[11px] leading-relaxed">
              Connected vehicle sensors feed coordinate data, speed ticks, and impact forces directly onto the Arc Network. No corporate middleman required.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Features */}
      <section className="py-16 border-t border-[#E0DDD5]">
        <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block text-center mb-2">FEATURES</span>
        <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide text-center mb-12">
          ENGINEERED FOR USERS AND LEASERS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-[#E0DDD5] p-8">
            <div className="h-10 w-10 bg-[#F2F1EC] text-[#1C2B3C] flex items-center justify-center rounded-sm mb-6 border border-[#DDDCD4]">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-widest mb-3">A. Crash-Sensor Freeze</h3>
            <p className="text-[#5A6573] text-xs leading-relaxed">
              Onboard impact metrics instantly switch the contract state to Disputed, preventing deposit withdrawals until claims are audited.
            </p>
          </div>

          <div className="bg-white border border-[#E0DDD5] p-8">
            <div className="h-10 w-10 bg-[#F2F1EC] text-[#1C2B3C] flex items-center justify-center rounded-sm mb-6 border border-[#DDDCD4]">
              <Gauge className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-widest mb-3">B. Per-KM Micro-Billing</h3>
            <p className="text-[#5A6573] text-xs leading-relaxed">
              Odometer delta streams trigger automatic distance-based charge deductions directly from the locked deposit.
            </p>
          </div>

          <div className="bg-white border border-[#E0DDD5] p-8">
            <div className="h-10 w-10 bg-[#F2F1EC] text-[#1C2B3C] flex items-center justify-center rounded-sm mb-6 border border-[#DDDCD4]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-widest mb-3">C. Speed Violations</h3>
            <p className="text-[#5A6573] text-xs leading-relaxed">
              Vehicle speed thresholds are monitored. Crossing owner-defined limits auto-disburses violation penalties.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="py-16 border-t border-[#E0DDD5]">
        <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block text-center mb-2">HOW IT WORKS</span>
        <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide text-center mb-12">
          3 STEP DEPLOYMENT
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-4">
            <div className="text-4xl font-black text-[#718096]">01</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Connect Wallet</h4>
            <p className="text-[#5A6573] text-xs px-4">
              Link your RainbowKit address. Sponsor gas operations with testnet USDC.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-4xl font-black text-[#718096]">02</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Authorize Lease</h4>
            <p className="text-[#5A6573] text-xs px-4">
              Select vehicle models and approve the collateral deposit USDC token transfer.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-4xl font-black text-[#718096]">03</div>
            <h4 className="font-bold text-[#1C2B3C] text-xs uppercase tracking-widest">Drive & Stream</h4>
            <p className="text-[#5A6573] text-xs px-4">
              On-board telematics stream coordinates. Settlement disperses on checkout.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Trust / Tech Stack */}
      <section className="py-16 border-t border-[#E0DDD5] text-center">
        <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block mb-4">ENGINEERING STACK</span>
        <div className="flex flex-wrap justify-center gap-8 items-center opacity-70">
          <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">ARC NETWORK (USDC GAS)</span>
          <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">CIRCLE APP-KIT</span>
          <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">VIEM ADAPTER V2</span>
          <span className="text-xs font-black text-[#1C2B3C] uppercase tracking-widest font-mono">RAINBOWKIT</span>
        </div>
      </section>

      {/* 6. Final CTA */}
      <section className="my-12 rounded-sm border border-[#DDDCD4] bg-[#EAE8E1] p-10 md:p-14 text-center">
        <h3 className="text-2xl md:text-3xl font-black text-[#1C2B3C] uppercase tracking-wider mb-4">
          LAUNCH YOUR VIRTUAL OBD-II NODE
        </h3>
        <p className="text-[#4A5568] text-xs font-semibold max-w-xl mx-auto mb-8 leading-relaxed">
          Test the escrow flow, trigger simulated high speed events, or throw collision logs inside our virtual simulator instantly. No real tokens required.
        </p>
        <button
          onClick={onLaunchApp}
          className="px-8 py-4 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-md mx-auto"
        >
          CONFIRM & LAUNCH CONSOLE
        </button>
      </section>
    </div>
  );
}
