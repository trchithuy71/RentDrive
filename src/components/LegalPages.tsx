'use client';

import React, { useState } from 'react';
import { ShieldAlert, BookOpen, Clock, FileText } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import RelatedNavigation from './RelatedNavigation';

export default function LegalPages({ defaultTab = 'privacy' }: { defaultTab?: 'privacy' | 'terms' }) {
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms'>(defaultTab);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <Breadcrumbs items={[
        { label: 'Home', url: '/' },
        { label: activeLegalTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service', url: activeLegalTab === 'privacy' ? '/privacy' : '/terms' }
      ]} />
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCDAD0] bg-white px-4 py-1.5 text-[10px] font-black tracking-widest text-[#1C2B3C] uppercase shadow-sm">
          <FileText className="h-3.5 w-3.5" /> LEGAL PROTOCOLS
        </span>
        <h1 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide">
          TERMS & PRIVACY
        </h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setActiveLegalTab('privacy')}
          className={`flex items-center gap-2 px-6 py-3 rounded-sm text-[10px] font-black tracking-wider uppercase border transition-all duration-300 ${
            activeLegalTab === 'privacy'
              ? 'bg-[#1C2B3C] text-white border-[#1C2B3C] shadow-sm'
              : 'bg-white text-[#5A6573] border-[#E0DDD5] hover:bg-[#F2F1EC]'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          PRIVACY POLICY
        </button>
        <button
          onClick={() => setActiveLegalTab('terms')}
          className={`flex items-center gap-2 px-6 py-3 rounded-sm text-[10px] font-black tracking-wider uppercase border transition-all duration-300 ${
            activeLegalTab === 'terms'
              ? 'bg-[#1C2B3C] text-white border-[#1C2B3C] shadow-sm'
              : 'bg-white text-[#5A6573] border-[#E0DDD5] hover:bg-[#F2F1EC]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          TERMS OF SERVICE
        </button>
      </div>

      {/* Main Document Panel */}
      <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 md:p-10 space-y-6 text-xs text-[#5A6573] leading-relaxed font-semibold relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1C2B3C]" />

        <div className="flex items-center gap-2 text-[10px] text-[#718096] font-bold uppercase tracking-wider font-mono">
          <Clock className="h-3.5 w-3.5" />
          <span>Last updated: June 2026</span>
        </div>
        
        {activeLegalTab === 'privacy' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wider pb-2 border-b border-[#F2F1EC]">
              PRIVACY POLICY SPECIFICATION
            </h2>

            <section className="space-y-3">
              <h4 className="font-black text-[#1C2B3C] uppercase tracking-wider text-xs">
                1. Telematics GPS & Sensor Logs
              </h4>
              <p className="font-medium text-justify">
                RentDrive interfaces directly with connected vehicle diagnostics hardware (OBD-II IoT modules) or simulated telemetry feeds. This information logs geographic coordinates, speedometer values, odometer increments, and impact forces. These metrics are processed to calculate micro-billing streams and enforce speed-limit safety vaults.
              </p>
            </section>

            <section className="space-y-3">
              <h4 className="font-black text-[#1C2B3C] uppercase tracking-wider text-xs">
                2. Data Retention & On-Chain Exposure
              </h4>
              <p className="font-medium text-justify">
                GPS coordinate deltas and telemetry speed values are stored ephemerally to settle billing differences. Only calculated aggregates (e.g. final odometer readings, speed limit breaches, crash state events) are permanently written to the public Arc blockchain network. RentDrive does not maintain central servers pairing physical identities with wallet address credentials.
              </p>
            </section>

            <section className="space-y-3">
              <h4 className="font-black text-[#1C2B3C] uppercase tracking-wider text-xs">
                3. Wallet Address & Security
              </h4>
              <p className="font-medium text-justify">
                Your public cryptographic address serves as your primary identifier. By utilizing the platform, you understand that all transaction histories, gasless contract operations, and escrow logs are publicly indexable on standard block explorers.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wider pb-2 border-b border-[#F2F1EC]">
              TERMS OF SERVICE AGREEMENT
            </h2>

            <section className="space-y-3">
              <h4 className="font-black text-[#1C2B3C] uppercase tracking-wider text-xs">
                1. On-Chain Deposit Escrow Authorization
              </h4>
              <p className="font-medium text-justify">
                By initiating a vehicle lease and signing the USDC authorization transaction via RainbowKit or Circle Developer Wallets, you direct the protocol to lock the specified deposit amount inside the Solidity smart contract escrow vault. Renter safety deposits cannot be claimed back or disbursed prior to check-out settlement.
              </p>
            </section>

            <section className="space-y-3">
              <h4 className="font-black text-[#1C2B3C] uppercase tracking-wider text-xs">
                2. Automated Telemetry-Enforced Penalties
              </h4>
              <p className="font-medium text-justify">
                By entering into a rental agreement, you consent to automated contract triggers. Telemetry logs indicating speeds in excess of owner-defined limits will automatically execute penalty deductions. Crash sensor signals indicating collision thresholds will lock down the remainder of the escrow, freezing checkout functions until review resolution.
              </p>
            </section>

            <section className="space-y-3">
              <h4 className="font-black text-[#1C2B3C] uppercase tracking-wider text-xs">
                3. Irreversibility of Web3 Executions
              </h4>
              <p className="font-medium text-justify">
                You acknowledge that all smart contract interactions—including start rentals, deposit freezes, and checkout distributions—are final, public, and irreversible. There are no corporate chargeback features or escrow overrides.
              </p>
            </section>
          </div>
        )}

      </div>

      {/* Legal Comms Discovery Pathway */}
      <RelatedNavigation currentView={activeLegalTab} />
    </div>
  );
}
