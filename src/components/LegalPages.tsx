'use client';

import React, { useState } from 'react';
import { ShieldAlert, BookOpen } from 'lucide-react';

export default function LegalPages() {
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Tab Switcher */}
      <div className="flex justify-center gap-2 mb-10">
        <button
          onClick={() => setActiveLegalTab('privacy')}
          className={`px-6 py-2.5 rounded-sm text-[10px] font-bold tracking-wider uppercase border transition-all ${
            activeLegalTab === 'privacy'
              ? 'bg-[#1C2B3C] text-white border-[#1C2B3C]'
              : 'bg-white text-[#5A6573] border-[#E0DDD5] hover:bg-[#F2F1EC]'
          }`}
        >
          PRIVACY POLICY
        </button>
        <button
          onClick={() => setActiveLegalTab('terms')}
          className={`px-6 py-2.5 rounded-sm text-[10px] font-bold tracking-wider uppercase border transition-all ${
            activeLegalTab === 'terms'
              ? 'bg-[#1C2B3C] text-white border-[#1C2B3C]'
              : 'bg-white text-[#5A6573] border-[#E0DDD5] hover:bg-[#F2F1EC]'
          }`}
        >
          TERMS OF SERVICE
        </button>
      </div>

      {/* Main Document Panel */}
      <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 md:p-10 space-y-6 text-xs text-[#5A6573] leading-relaxed font-medium">
        
        {activeLegalTab === 'privacy' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wider pb-2 border-b border-[#F2F1EC] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> PRIVACY POLICY SPECIFICATION
            </h2>
            <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest font-mono">Last updated: May 2026</span>

            <section className="space-y-2">
              <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider">1. Telematics GPS & Sensor Logs</h4>
              <p>
                RentDrive interfaces with simulated vehicle hardware parameters (latitude, longitude, speed vectors, odometer logs, impact forces). These data inputs are routed in real-time to compute smart contract gas logic.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider">2. Data Custody & Retention</h4>
              <p>
                All log updates are stored ephemerally to execute transaction mappings on the public Arc blockchain scanner. RentDrive holds no personal database records that connect Web3 wallet public keys with real-world driver identity profiles.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wider pb-2 border-b border-[#F2F1EC] flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> TERMS OF SERVICE AGREEMENT
            </h2>
            <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest font-mono">Last updated: May 2026</span>

            <section className="space-y-2">
              <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider">1. On-chain Deposit Escrow Terms</h4>
              <p>
                By connecting your Web3 wallet address and confirming a rental deployment, you authorize RentDrive to lock the specified USDC collateral inside the Solidity contract vault standard.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider">2. Automated Telemetry Penalty Rules</h4>
              <p>
                Speed limit violations beyond the listed threshold trigger automated deductions. Impact force reports instantly lock the deposit, shifting user profiles into Disputed claim channels. All on-chain executions are irreversible.
              </p>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
