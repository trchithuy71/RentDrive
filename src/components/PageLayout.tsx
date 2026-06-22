'use client';

import React, { useState } from 'react';
import Navbar from './Navbar';
import Link from 'next/link';

interface PageLayoutProps {
  children: React.ReactNode;
  currentView: string;
}

export default function PageLayout({ children, currentView }: PageLayoutProps) {
  const [dappTab, setDappTab] = useState('marketplace');

  return (
    <div className="min-h-screen bg-[#F2F1EC] text-[#18222F] flex flex-col">
      {/* Shared Unified Navbar */}
      <Navbar 
        currentView={currentView} 
        setCurrentView={() => {}} 
        dappTab={dappTab} 
        setDappTab={setDappTab} 
      />

      {/* Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-6">
        {children}
      </main>

      {/* Elegant minimalist Footer */}
      <footer className="border-t border-[#E0DDD5] bg-[#EAE8E1] py-10 text-center text-[10px] text-[#718096] font-bold uppercase tracking-widest">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <span>© 2026 RENTDRIVE · ALL RIGHTS RESERVED.</span>
            <div className="flex gap-3">
              <Link href="/privacy" className="hover:text-[#1C2B3C] transition-colors">PRIVACY POLICY</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-[#1C2B3C] transition-colors">TERMS OF SERVICE</Link>
            </div>
          </div>
          <div className="flex gap-4">
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="hover:text-[#1C2B3C] transition-colors">ARC SCAN EXPLORER</a>
            <span>·</span>
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="hover:text-[#1C2B3C] transition-colors">CIRCLE FAUCET</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
