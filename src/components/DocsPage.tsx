'use client';

import React, { useState } from 'react';
import { Terminal, Shield, Cpu, RefreshCw, Copy, Check } from 'lucide-react';

export default function DocsPage() {
  const [activeSubTab, setActiveSubTab] = useState<'intro' | 'quickstart' | 'contract' | 'telemetry'>('intro');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const navItems = [
    { id: 'intro' as const, label: 'INTRODUCTION' },
    { id: 'quickstart' as const, label: 'QUICK START' },
    { id: 'contract' as const, label: 'SMART CONTRACTS' },
    { id: 'telemetry' as const, label: 'TELEMETRY OBD-II' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Left Column Sidebar */}
      <div className="md:col-span-1 space-y-2">
        <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-4 px-3">DOCUMENTATION MENU</span>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`text-left px-3 py-2 rounded-sm text-[10px] font-bold tracking-wider uppercase transition-all ${
                activeSubTab === item.id
                  ? 'bg-[#1C2B3C] text-white'
                  : 'text-[#5A6573] hover:text-[#1C2B3C] hover:bg-[#EAE8E1]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Column Content */}
      <div className="md:col-span-3 rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-6">
        
        {activeSubTab === 'intro' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#1C2B3C] uppercase tracking-wide pb-2 border-b border-[#F2F1EC]">
              INTRODUCTION
            </h2>
            <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
              RentDrive is a peer-to-peer automotive sharing layer built on top of the **Arc Testnet**, utilizing **USDC stablecoins** as the primary gas and value exchange medium.
            </p>
            <p className="text-xs text-[#5A6573] leading-relaxed font-medium">
              By connecting physical telematics (OBD-II vehicle systems) directly to smart contract escrow logs, RentDrive resolves two major trust issues in traditional rentals:
            </p>
            <ul className="space-y-3 text-xs text-[#5A6573] font-semibold list-disc pl-5">
              <li>
                <span className="text-[#1C2B3C] font-bold uppercase">Automated Escrow Settlements:</span> Security deposits are not held in corporate custody accounts. They are locked on-chain and disbursed only based on checked telemetry data.
              </li>
              <li>
                <span className="text-[#1C2B3C] font-bold uppercase">DePIN Telemetry Protection:</span> GPS logs, odometer updates, and impact sensors determine rental rates dynamically, preventing post-lease insurance disputes.
              </li>
            </ul>
          </div>
        )}

        {activeSubTab === 'quickstart' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#1C2B3C] uppercase tracking-wide pb-2 border-b border-[#F2F1EC]">
              QUICK START GUIDE
            </h2>
            
            <p className="text-xs text-[#5A6573] font-medium leading-relaxed">
              RentDrive is optimized for simple terminal deployment. Configure your local environment by calling our helper scripts:
            </p>

            {/* Code Block 1 */}
            <div>
              <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                <span className="text-[8px] font-bold text-[#718096] uppercase tracking-wider font-mono">1. Dependencies installation</span>
                <button
                  onClick={() => handleCopy('npm install --legacy-peer-deps', 'install')}
                  className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm"
                >
                  {copiedText === 'install' ? <Check className="h-3 w-3 text-green-700" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <pre className="bg-[#1C2B3C] text-[#F2F1EC] p-4 text-[10px] font-mono rounded-b-sm overflow-x-auto">
                npm install --legacy-peer-deps
              </pre>
            </div>

            {/* Code Block 2 */}
            <div>
              <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                <span className="text-[8px] font-bold text-[#718096] uppercase tracking-wider font-mono">2. Wallet setup & Faucet Funding</span>
                <button
                  onClick={() => handleCopy('node scripts/generate-wallet.js', 'wallet')}
                  className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm"
                >
                  {copiedText === 'wallet' ? <Check className="h-3 w-3 text-green-700" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <pre className="bg-[#1C2B3C] text-[#F2F1EC] p-4 text-[10px] font-mono rounded-b-sm overflow-x-auto">
                node scripts/generate-wallet.js
              </pre>
              <span className="block text-[8px] text-[#718096] font-semibold mt-1">
                * Generates .env locally. Fund the printed address via https://faucet.circle.com (Arc Testnet).
              </span>
            </div>

            {/* Code Block 3 */}
            <div>
              <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                <span className="text-[8px] font-bold text-[#718096] uppercase tracking-wider font-mono">3. Compilation & Contract Deployment</span>
                <button
                  onClick={() => handleCopy('node scripts/compile.js && node scripts/deploy.js', 'deploy')}
                  className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm"
                >
                  {copiedText === 'deploy' ? <Check className="h-3 w-3 text-green-700" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <pre className="bg-[#1C2B3C] text-[#F2F1EC] p-4 text-[10px] font-mono rounded-b-sm overflow-x-auto">
                node scripts/compile.js && node scripts/deploy.js
              </pre>
            </div>
          </div>
        )}

        {activeSubTab === 'contract' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#1C2B3C] uppercase tracking-wide pb-2 border-b border-[#F2F1EC]">
              SMART CONTRACT ABSTRACTION
            </h2>
            <p className="text-xs text-[#5A6573] font-medium leading-relaxed">
              `RentDrive.sol` manages vehicle properties, security deposit locks, and checkout disbursements.
            </p>

            <div className="space-y-4 rounded-sm bg-[#F2F1EC] p-5 border border-[#DDDCD4]">
              <div>
                <span className="block text-[9px] text-[#1C2B3C] font-mono font-bold uppercase"><code>startRental(uint256 vehicleId, uint256 startOdometerMeters)</code></span>
                <p className="text-[#5A6573] text-[10px] leading-relaxed mt-0.5 font-medium">
                  Locks the deposit USDC directly within the escrow. Renter signature standard required.
                </p>
              </div>
              <div className="border-t border-[#DDDCD4] pt-3">
                <span className="block text-[9px] text-[#1C2B3C] font-mono font-bold uppercase"><code>updateTelemetry(uint256 rentalId, uint256 odometerMeters, uint256 speedKmh, bool crashSensor)</code></span>
                <p className="text-[#5A6573] text-[10px] leading-relaxed mt-0.5 font-medium">
                  Invoked by the oracle route. Updates odometer aggregates, checks for speed violations, and evaluates crash status.
                </p>
              </div>
              <div className="border-t border-[#DDDCD4] pt-3">
                <span className="block text-[9px] text-[#1C2B3C] font-mono font-bold uppercase"><code>endRental(uint256 rentalId)</code></span>
                <p className="text-[#5A6573] text-[10px] leading-relaxed mt-0.5 font-medium">
                  Calculates final distance costs. Transfers accumulated fees to the vehicle owner and refunds the balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'telemetry' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#1C2B3C] uppercase tracking-wide pb-2 border-b border-[#F2F1EC]">
              TELEMETRY OBD-II ORACLE LAYER
            </h2>
            <p className="text-xs text-[#5A6573] font-medium leading-relaxed">
              Vehicle OBD-II simulators communicate with our Next.js telemetry router via JSON API endpoints. On collision force triggers, the route dispatches on-chain transactions to secure the collateral.
            </p>

            <div>
              <div className="flex justify-between items-center bg-[#F2F1EC] px-4 py-2 border border-[#DDDCD4] border-b-0 rounded-t-sm">
                <span className="text-[8px] font-bold text-[#718096] uppercase tracking-wider font-mono">POST /api/telemetry JSON payload</span>
                <button
                  onClick={() => handleCopy(JSON.stringify({ rentalId: 1, speed: 105, odometer: 102000, crashSensor: false }, null, 2), 'telemetry')}
                  className="text-[#718096] hover:text-[#1C2B3C] p-1 rounded-sm"
                >
                  {copiedText === 'telemetry' ? <Check className="h-3 w-3 text-green-700" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <pre className="bg-[#1C2B3C] text-[#F2F1EC] p-4 text-[10px] font-mono rounded-b-sm overflow-x-auto">
{`{
  "rentalId": 1,
  "speed": 105,
  "odometer": 102000,
  "crashSensor": false
}`}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
