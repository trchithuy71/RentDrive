'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import LandingPage from '@/components/LandingPage';
import DocsPage from '@/components/DocsPage';
import FAQPage from '@/components/FAQPage';
import AboutPage from '@/components/AboutPage';
import ContactPage from '@/components/ContactPage';
import LegalPages from '@/components/LegalPages';
import Marketplace from '@/components/Marketplace';
import MyRentals from '@/components/MyRentals';
import OwnerPortal from '@/components/OwnerPortal';
import SwapConsole from '@/components/SwapConsole';
import AgentOS from '@/components/AgentOS';
import dynamic from 'next/dynamic';

const Simulator = dynamic(() => import('@/components/Simulator'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-24 border border-dashed border-[#DDDCD4] bg-[#EAE8E1]/30 rounded-sm font-bold uppercase tracking-widest text-[#718096] text-xs">
      Loading Telematics Simulator Component...
    </div>
  )
});

export default function Home() {
  const [currentView, setCurrentView] = useState('landing');
  const [dappTab, setDappTab] = useState('marketplace');

  return (
    <div className="min-h-screen bg-[#F2F1EC] text-[#18222F] flex flex-col">
      {/* Shared Unified Navbar */}
      <Navbar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        dappTab={dappTab} 
        setDappTab={setDappTab} 
      />

      {/* Main View Router */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-6">
        {currentView === 'landing' && (
          <LandingPage 
            onLaunchApp={() => setCurrentView('app')} 
            onNavigate={setCurrentView} 
          />
        )}
        {currentView === 'docs' && <DocsPage />}
        {currentView === 'faq' && <FAQPage />}
        {currentView === 'about' && <AboutPage />}
        {currentView === 'contact' && <ContactPage />}
        {currentView === 'privacy' && <LegalPages />}
        {currentView === 'terms' && <LegalPages />}

        {currentView === 'app' && (
          <>
            {dappTab === 'marketplace' && (
              <Marketplace onRentalStarted={() => setDappTab('rentals')} />
            )}
            {dappTab === 'agent' && (
              <AgentOS />
            )}
            {dappTab === 'swap' && (
              <SwapConsole />
            )}
            {dappTab === 'rentals' && (
              <MyRentals activeTab={dappTab} />
            )}
            {dappTab === 'owner' && (
              <OwnerPortal activeTab={dappTab} />
            )}
            {dappTab === 'simulator' && (
              <Simulator />
            )}
          </>
        )}
      </main>

      {/* Elegant minimalist Footer */}
      <footer className="border-t border-[#E0DDD5] bg-[#EAE8E1] py-10 text-center text-[10px] text-[#718096] font-bold uppercase tracking-widest">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <span>© 2026 RENTDRIVE · ALL RIGHTS RESERVED.</span>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('privacy')} className="hover:text-[#1C2B3C] transition-colors">PRIVACY POLICY</button>
              <span>·</span>
              <button onClick={() => setCurrentView('terms')} className="hover:text-[#1C2B3C] transition-colors">TERMS OF SERVICE</button>
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
