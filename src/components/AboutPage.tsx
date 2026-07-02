'use client';

import React from 'react';
import { Target, Users, Landmark, Flame, Compass, GitBranch, Shield, Zap, Cpu } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import RelatedNavigation from './RelatedNavigation';

export default function AboutPage() {
  const milestones = [
    {
      date: 'JUNE 2026',
      title: 'HACKATHON DEPLOYMENT',
      desc: 'Conceived RentDrive at the Stablecoins Commerce Stack Challenge. Deployed basic Solidity escrow mechanism on Arc Testnet.'
    },
    {
      date: 'MID JUNE 2026',
      title: 'TELEMATICS ORACLE INTEGRATION',
      desc: 'Linked virtual OBD-II telemetry streams to smart contract. Succeeded in executing real-time distance micro-billing.'
    },
    {
      date: 'PRESENT',
      title: 'APP SUITE POLISHING',
      desc: 'Designed clean user portals, gasless paymasters via Circle, and interactive sandbox simulations for public validation.'
    }
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-16 animate-fade-in">
      <Breadcrumbs items={[
        { label: 'Home', url: '/' },
        { label: 'About', url: '/about' }
      ]} />
      {/* Hero Header */}
      <div className="text-center py-6 space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCDAD0] bg-white px-4 py-1.5 text-[10px] font-black tracking-widest text-[#1C2B3C] uppercase shadow-sm">
          <Compass className="h-3.5 w-3.5" /> ORIGIN STORY & MISSION
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#1C2B3C] leading-none uppercase">
          ABOUT RENTDRIVE
        </h1>
        <p className="text-[#5A6573] text-xs font-semibold leading-relaxed max-w-2xl mx-auto">
          Building the decentralized trust layer for the future of peer-to-peer transport sharing and stablecoin-sponsored commerce.
        </p>
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-4 hover:shadow-md transition-all duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC] flex items-center gap-2">
            <Users className="h-4.5 w-4.5" /> OUR MISSION
          </h3>
          <p className="text-xs text-[#5A6573] leading-relaxed font-semibold">
            To eliminate legacy rental intermediaries and subjective insurance claims by deploying secure smart contract escrows. We empower vehicle owners to lease assets safely and renters to pay strictly for the distance they travel.
          </p>
        </div>

        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-4 hover:shadow-md transition-all duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC] flex items-center gap-2">
            <Target className="h-4.5 w-4.5" /> OUR VISION
          </h3>
          <p className="text-xs text-[#5A6573] leading-relaxed font-semibold">
            We envision a modular transport economy where cars autonomously calculate lease costs, audit safety compliance, and settle claims directly on public Web3 rails without corporate custodian nodes.
          </p>
        </div>
      </div>

      {/* Story section */}
      <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 md:p-10 space-y-6 hover:shadow-md transition-all duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1C2B3C]" />
        <h3 className="text-xs font-black uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC]">
          THE HACKATHON PROTOCODE
        </h3>
        <div className="space-y-4 text-xs text-[#5A6573] leading-relaxed font-medium">
          <p>
            RentDrive was conceived during the **Stablecoins Commerce Stack Challenge** to address real-world inefficiencies in car rentals. While digital payments have evolved, renting a physical asset remains bogged down in manual processes, trust barriers, and high merchant processing fees.
          </p>
          <p>
            By combining **Arc Network\'s** USDC gas standard and **Circle\'s Developer Tools**, we engineered a protocol where vehicles double as independent economic actors. Escrows settle on-chain in real-time, gas fees are abstracted seamlessly for the renter, and hardware sensors report odometer metrics to enforce billing parameters transparently.
          </p>
        </div>
      </div>

      {/* Interactive Milestones */}
      <div className="space-y-8">
        <div className="text-center">
          <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1">
            DEVELOPMENT ROADMAP
          </span>
          <h3 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wide">
            PROJECT CHRONOLOGY
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {milestones.map((m, i) => (
            <div key={i} className="p-6 bg-white border border-[#E0DDD5] rounded-sm space-y-2 relative">
              <span className="absolute -top-3.5 left-4 px-2 py-0.5 bg-[#1C2B3C] text-white text-[8px] font-black tracking-widest uppercase rounded-sm">
                {m.date}
              </span>
              <h4 className="text-[10px] font-black text-[#1C2B3C] uppercase tracking-wider pt-2">
                {m.title}
              </h4>
              <p className="text-[11px] text-[#5A6573] leading-relaxed font-semibold">
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Team / Contact CTA */}
      <div className="text-center border-t border-[#E0DDD5] pt-12">
        <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-4">
          STABLECOIN ECONOMY PRINCIPLES
        </span>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] text-[#1C2B3C] font-black uppercase tracking-wider font-mono opacity-80">
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> USDC GAS SECURE</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> OBD-II TELEMETRY COMPLIANT</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> SOLIDITY TRUST MINIMIZED</span>
        </div>
      </div>

      {/* Recommended Content Discoverer */}
      <RelatedNavigation currentView="about" />
    </div>
  );
}
