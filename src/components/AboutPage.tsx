'use client';

import React from 'react';
import { Target, Users, Landmark, Flame, Compass } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-12">
      {/* Hero Header */}
      <div className="text-center py-6">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#1C2B3C] px-3.5 py-1.5 text-[9px] font-bold tracking-widest text-[#F2F1EC] uppercase mb-6">
          <Compass className="h-3.5 w-3.5" /> ORIGIN STORY & MISSION
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#1C2B3C] leading-none uppercase">
          ABOUT RENTDRIVE
        </h1>
        <p className="mt-4 text-[#5A6573] text-xs font-semibold leading-relaxed max-w-2xl mx-auto">
          We are building the decentralized trust layer for the future of peer-to-peer sharing and Stablecoin-sponsored transport commerce.
        </p>
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC] flex items-center gap-2">
            <Users className="h-4.5 w-4.5" /> OUR MISSION
          </h3>
          <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
            To eliminate central rental authorities and insurance middle-men by deploying audited smart contract escrows. We empower vehicle owners to lease their assets safely and renters to pay strictly for the distance they travel.
          </p>
        </div>

        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC] flex items-center gap-2">
            <Target className="h-4.5 w-4.5" /> OUR VISION
          </h3>
          <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
            We envision a modular transportation economy where vehicles autonomously compute their own leasing rates, speeding violations, and collision claims directly on public decentralized rails.
          </p>
        </div>
      </div>

      {/* Story section */}
      <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 md:p-10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC]">
          THE HACKATHON CONCEPT
        </h3>
        <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
          RentDrive was conceived during the Stablecoins Commerce Stack Challenge as a showcase for the **Arc Testnet** and **Circle developer platform**. 
        </p>
        <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
          Our team recognized that while stablecoins like USDC are perfect for commerce, typical gas constraints make peer-to-peer micro-billing impractical. By utilizing Arc\'s USDC-first gas design and Circle\'s programmatic wallets, we bridged this gap—creating a frictionless rental pipeline where all transactions reside securely on-chain.
        </p>
      </div>

      {/* Tech Stack Trust badges */}
      <div className="text-center">
        <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-4">PLATFORM COMPLIANCE</span>
        <div className="inline-flex flex-wrap justify-center gap-6 text-[10px] text-[#1C2B3C] font-black uppercase tracking-wider font-mono">
          <span>USDC GAS COMPLIANT</span>
          <span>·</span>
          <span>DEPIN INTEGRATED</span>
          <span>·</span>
          <span>SOLIDITY ESCROW POWERED</span>
        </div>
      </div>
    </div>
  );
}
