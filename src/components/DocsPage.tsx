'use client';

import React, { useState } from 'react';
import { Terminal, Shield, Cpu, RefreshCw, Copy, Check, BookOpen, Layers, Zap, Code } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import RelatedNavigation from './RelatedNavigation';

export default function DocsPage() {
  const [activeSubTab, setActiveSubTab] = useState<'intro' | 'quickstart' | 'contract' | 'telemetry'>('intro');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const navItems = [
    { id: 'intro' as const, label: 'INTRODUCTION', description: 'Concepts & Architecture' },
    { id: 'quickstart' as const, label: 'QUICK START', description: 'Get started in minutes' },
    { id: 'contract' as const, label: 'SMART CONTRACTS', description: 'Solidity ABI details' },
    { id: 'telemetry' as const, label: 'TELEMETRY OBD-II', description: 'IoT Oracle Specification' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Breadcrumbs items={[
        { label: 'Home', url: '/' },
        { label: 'Docs', url: '/docs' }
      ]} />
      {/* Page Title Header */}
      <div className="border-b border-[#DDDCD4] pb-8 mb-10 space-y-2">
        <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">
          DEVELOPER HUB
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-[#1C2B3C] uppercase tracking-wide">
          DOCUMENTATION
        </h1>
        <p className="text-xs text-[#5A6573] font-semibold max-w-xl">
          Integrate physical vehicle sensors with smart contract escrows using the Circle App-Kit and Arc Network.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
        {/* Left Column Sidebar - Hidden on mobile, but transformed to list on mobile */}
        <div className="lg:col-span-1 space-y-4">
          <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest px-3">
            DOCUMENTATION SITEMAP
          </span>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-col gap-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id)}
                className={`text-left px-4 py-3 rounded-sm transition-all duration-200 border-l-2 ${
                  activeSubTab === item.id
                    ? 'bg-[#1C2B3C] text-white border-[#1C2B3C]'
                    : 'text-[#5A6573] hover:text-[#1C2B3C] hover:bg-[#EAE8E1] border-transparent'
                }`}
              >
                <div className="text-[10px] font-black tracking-wider uppercase">{item.label}</div>
                <div className={`text-[8.5px] font-semibold tracking-wide ${
                  activeSubTab === item.id ? 'text-[#A0AEC0]' : 'text-[#718096]'
                }`}>{item.description}</div>
              </button>
            ))}
          </nav>

          {/* Mobile Dropdown Nav Selector */}
          <div className="lg:hidden w-full">
            <select
              value={activeSubTab}
              onChange={(e) => setActiveSubTab(e.target.value as any)}
              className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-3 text-xs font-bold text-[#1C2B3C] uppercase tracking-wide focus:outline-none"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column Content */}
        <div className="lg:col-span-3 rounded-sm border border-[#E0DDD5] bg-white p-6 md:p-8 space-y-8 min-h-[500px]">
          
          {/* INTRO SUBTAB */}
          {activeSubTab === 'intro' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F2F1EC]">
                <BookOpen className="h-5 w-5 text-[#1C2B3C]" />
                <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wide">
                  INTRODUCTION
                </h2>
              </div>
              <p className="text-xs text-[#5A6573] leading-relaxed font-semibold">
                RentDrive is an open-source peer-to-peer (P2P) vehicle sharing protocol built during the Stablecoins Commerce Stack Challenge. It uses the **Arc Network** (which facilitates stablecoins as the gas standard) to handle fast, cost-predictive settlement transactions.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#F2F1EC]/50 border border-[#E0DDD5] rounded-sm space-y-2">
                  <h4 className="text-[10px] font-bold text-[#1C2B3C] uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Automated Escrow Vaults
                  </h4>
                  <p className="text-[11px] text-[#5A6573] leading-relaxed font-medium">
                    Collateral stays locked in transparent, audited smart contract vaults. Funds are only transferred based on verified IoT mileage telemetry or authorized check-outs.
                  </p>
                </div>
                <div className="p-4 bg-[#F2F1EC]/50 border border-[#E0DDD5] rounded-sm space-y-2">
                  <h4 className="text-[10px] font-bold text-[#1C2B3C] uppercase tracking-widest flex items-center gap-1.5">
                    <Cpu className="h-4 w-4" /> DePIN Telemetry Oracle
                  </h4>
                  <p className="text-[11px] text-[#5A6573] leading-relaxed font-medium">
                    OBD-II hardware diagnostics connect straight to on-chain logs. GPS, speeds, and forces calculate actual rental fees and enforce safety policies.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#F2F1EC] pt-4">
                <h3 className="text-xs font-bold text-[#1C2B3C] uppercase tracking-wider mb-2">
                  HOW IS GAS SPONSORED?
                </h3>
                <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
                  We use **Circle App-Kit developer tools** to hook into gas abstraction. Renters submit EIP-712 typed signatures to authorize movements. The paymaster relays transactions on Arc, sponsoring the fees directly using our stablecoin treasury.
                </p>
              </div>
            </div>
          )}

          {/* QUICK START SUBTAB */}
          {activeSubTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F2F1EC]">
                <Layers className="h-5 w-5 text-[#1C2B3C]" />
                <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wide">
                  QUICK START GUIDE
                </h2>
              </div>
              
              <p className="text-xs text-[#5A6573] font-semibold leading-relaxed">
                Follow these shell commands to compile the contracts and spin up a local telemetry terminal node:
              </p>

              {/* Install Code */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                  <span className="text-[8px] font-black text-[#718096] uppercase tracking-wider font-mono">
                    1. INSTALL DIRECT DEPENDENCIES
                  </span>
                  <button
                    onClick={() => handleCopy('npm install --legacy-peer-deps', 'install')}
                    className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm transition-colors"
                  >
                    {copiedText === 'install' ? <Check className="h-3.5 w-3.5 text-green-700 font-bold" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <pre className="bg-[#18222F] text-[#F2F1EC] p-4 text-[10.5px] font-mono rounded-b-sm overflow-x-auto shadow-inner leading-relaxed">
                  npm install --legacy-peer-deps
                </pre>
              </div>

              {/* Gen Wallet Code */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                  <span className="text-[8px] font-black text-[#718096] uppercase tracking-wider font-mono">
                    2. DEPLOY WALLET SETTINGS
                  </span>
                  <button
                    onClick={() => handleCopy('node scripts/generate-wallet.js', 'wallet')}
                    className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm transition-colors"
                  >
                    {copiedText === 'wallet' ? <Check className="h-3.5 w-3.5 text-green-700 font-bold" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <pre className="bg-[#18222F] text-[#F2F1EC] p-4 text-[10.5px] font-mono rounded-b-sm overflow-x-auto shadow-inner leading-relaxed">
                  node scripts/generate-wallet.js
                </pre>
                <div className="p-3 bg-yellow-50 border border-yellow-200 text-[#718096] text-[9.5px] font-semibold leading-relaxed">
                  * Note: This writes private parameters to `.env`. Request Arc Testnet USDC from the official <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-[#1C2B3C] font-black underline hover:text-[#111A24]">Circle Faucet</a> to fund the printed address before deploying.
                </div>
              </div>

              {/* Deploy Code */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                  <span className="text-[8px] font-black text-[#718096] uppercase tracking-wider font-mono">
                    3. COMPILE & DEPLOY SMART CONTRACT
                  </span>
                  <button
                    onClick={() => handleCopy('node scripts/compile.js && node scripts/deploy.js', 'deploy')}
                    className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm transition-colors"
                  >
                    {copiedText === 'deploy' ? <Check className="h-3.5 w-3.5 text-green-700 font-bold" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <pre className="bg-[#18222F] text-[#F2F1EC] p-4 text-[10.5px] font-mono rounded-b-sm overflow-x-auto shadow-inner leading-relaxed">
                  node scripts/compile.js && node scripts/deploy.js
                </pre>
              </div>
            </div>
          )}

          {/* SMART CONTRACT SUBTAB */}
          {activeSubTab === 'contract' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F2F1EC]">
                <Code className="h-5 w-5 text-[#1C2B3C]" />
                <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wide">
                  SMART CONTRACT API
                </h2>
              </div>
              <p className="text-xs text-[#5A6573] font-semibold leading-relaxed">
                The RentDrive contract (`RentDrive.sol`) holds USDC balances, logs active telemetry feeds, and manages penalty criteria. Key Solidity interfaces include:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-[#F2F1EC]/65 border border-[#DDDCD4] rounded-sm space-y-1.5">
                  <code className="text-[10px] text-[#1C2B3C] font-mono font-black uppercase">
                    startRental(uint256 vehicleId, uint256 startOdometerMeters)
                  </code>
                  <p className="text-[#5A6573] text-[11px] leading-relaxed font-semibold">
                    locks the security deposit inside the escrow state machine. The contract verifies the renter has approved USDC allowance beforehand.
                  </p>
                </div>

                <div className="p-4 bg-[#F2F1EC]/65 border border-[#DDDCD4] rounded-sm space-y-1.5">
                  <code className="text-[10px] text-[#1C2B3C] font-mono font-black uppercase">
                    updateTelemetry(uint256 rentalId, uint256 odometerMeters, uint256 speedKmh, bool crashSensor)
                  </code>
                  <p className="text-[#5A6573] text-[11px] leading-relaxed font-semibold">
                    invoked by the verified oracle middleware. Evaluates mileage deltas, assesses speed limit breaches, and executes state lock on crash warnings.
                  </p>
                </div>

                <div className="p-4 bg-[#F2F1EC]/65 border border-[#DDDCD4] rounded-sm space-y-1.5">
                  <code className="text-[10px] text-[#1C2B3C] font-mono font-black uppercase">
                    endRental(uint256 rentalId)
                  </code>
                  <p className="text-[#5A6573] text-[11px] leading-relaxed font-semibold">
                    settles remaining balances. Disburses distance costs to the vehicle owner and refunds the leftover deposit to the renter.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TELEMETRY SUBTAB */}
          {activeSubTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F2F1EC]">
                <Cpu className="h-5 w-5 text-[#1C2B3C]" />
                <h2 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wide">
                  TELEMETRY OBD-II ORACLE LAYER
                </h2>
              </div>
              <p className="text-xs text-[#5A6573] font-semibold leading-relaxed">
                Physical vehicle hardware streams coordinates, mileage, and force vector details directly to the RentDrive API router via HTTP payload:
              </p>

              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                  <span className="text-[8px] font-black text-[#718096] uppercase tracking-wider font-mono">
                    POST /api/telemetry JSON payload
                  </span>
                  <button
                    onClick={() => handleCopy(JSON.stringify({ rentalId: 1, speed: 85, odometer: 102450, crashSensor: false }, null, 2), 'telemetry')}
                    className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm transition-colors"
                  >
                    {copiedText === 'telemetry' ? <Check className="h-3.5 w-3.5 text-green-700 font-bold" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <pre className="bg-[#18222F] text-[#F2F1EC] p-4 text-[10.5px] font-mono rounded-b-sm overflow-x-auto shadow-inner leading-relaxed">
{`{
  "rentalId": 1,
  "speed": 85,
  "odometer": 102450,
  "crashSensor": false
}`}
                </pre>
              </div>
              
              <div className="p-4 bg-[#F2F1EC]/50 border border-[#E0DDD5] rounded-sm">
                <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1">
                  VAULT DISPUTE PROCESSOR
                </span>
                <p className="text-xs text-[#5A6573] leading-relaxed font-semibold">
                  If `crashSensor` is logged as `true`, the middleware oracle executes an emergency gasless transaction that updates the contract status, locking down custody instantly before additional mileage claims can accumulate.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Discovery Hub Content Linking */}
      <RelatedNavigation currentView="docs" />
    </div>
  );
}
