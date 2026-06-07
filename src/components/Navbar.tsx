'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Car, ShieldAlert, Cpu, Landmark, Sparkles, BookOpen, HelpCircle, Users, Mail, LogOut, ArrowRight, Zap, Download } from 'lucide-react';
import UnifiedBalance from './UnifiedBalance';
import BridgeModal from './BridgeModal';
import GaslessReceiptModal from './GaslessReceiptModal';
import { useCircleApp } from '@/contexts/CircleAppContext';
import NotificationCenter from './NotificationCenter';
import { useContractEvents } from '@/hooks/useContractEvents';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  dappTab: string;
  setDappTab: (tab: string) => void;
}

export default function Navbar({ currentView, setCurrentView, dappTab, setDappTab }: NavbarProps) {
  const { gaslessEnabled, setGaslessEnabled } = useCircleApp();
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Start listening to blockchain contract events in real-time
  useContractEvents();

  const guestNavItems = [
    { id: 'landing', label: 'HOME', icon: Car },
    { id: 'docs', label: 'DOCS', icon: BookOpen },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'about', label: 'ABOUT', icon: Users },
    { id: 'contact', label: 'CONTACT', icon: Mail },
  ];

  const dappNavItems = [
    { id: 'marketplace', label: 'MARKETPLACE', icon: Car },
    { id: 'rentals', label: 'MY RENTALS', icon: ShieldAlert },
    { id: 'owner', label: 'OWNER PORTAL', icon: Landmark },
    { id: 'simulator', label: 'TELEMATICS SIMULATOR', icon: Cpu },
  ];

  const isDappMode = currentView === 'app';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E0DDD5] bg-[#F2F1EC]/90 backdrop-blur-md">
      {showInstallBanner && (
        <div className="bg-[#1C2B3C] text-[#F2F1EC] px-6 py-3.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider border-b border-[#2C3E50] animate-slide-down">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#D4AF37] text-[#1C2B3C] rounded-sm px-2 py-0.5 text-[9px] font-black">PWA</span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#F2F1EC]">Install RentDrive on your device for fast offline access</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleInstallClick}
              className="bg-[#F2F1EC] hover:bg-white text-[#1C2B3C] px-3.5 py-1.5 rounded-sm text-[9px] font-black tracking-widest uppercase transition-all shadow-sm flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> INSTALL
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-[#718096] hover:text-white px-2 py-1.5 transition-all text-[9px] font-black"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl h-20 items-center justify-between px-6">
        
        {/* Portage-inspired Premium Logo */}
        <div 
          className="flex items-center gap-3.5 cursor-pointer" 
          onClick={() => {
            setCurrentView('landing');
          }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#1C2B3C] text-[#F2F1EC] shadow-sm">
            <Car className="h-5.5 w-5.5 stroke-[1.8]" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xl font-black tracking-widest text-[#1C2B3C] font-sans leading-none">RENTDRIVE</span>
            <span className="block text-[9px] text-[#5A6573] font-mono tracking-widest uppercase mt-1">ESCROW & DEPIN PLATFORM</span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        {!isDappMode ? (
          /* Guest Mode Navigation */
          <nav className="hidden md:flex items-center gap-1.5 rounded-sm bg-[#E7E5DD]/70 p-1 border border-[#DCDAD0]/80">
            {guestNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-sm text-[10px] font-bold tracking-widest transition-all ${
                    isActive
                      ? 'bg-[#1C2B3C] text-white shadow-sm'
                      : 'text-[#4A5568] hover:text-[#1C2B3C] hover:bg-[#DCDAD0]/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          /* Web3 DApp Console Navigation */
          <nav className="hidden md:flex items-center gap-1.5 rounded-sm bg-[#E7E5DD]/70 p-1 border border-[#DCDAD0]/80">
            {dappNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = dappTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setDappTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-sm text-[10px] font-bold tracking-widest transition-all ${
                    isActive
                      ? 'bg-[#1C2B3C] text-white shadow-sm'
                      : 'text-[#4A5568] hover:text-[#1C2B3C] hover:bg-[#DCDAD0]/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Action Controls & Connect Button */}
        <div className="flex items-center gap-4">
          {!isDappMode ? (
            <button
              onClick={() => setCurrentView('app')}
              className="hidden lg:flex items-center gap-2 px-5 py-3 rounded-sm bg-[#1C2B3C] text-white text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm"
            >
              LAUNCH APP <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setGaslessEnabled(!gaslessEnabled)}
                className={`flex items-center gap-1.5 px-3 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase border transition-all ${
                  gaslessEnabled
                    ? 'bg-[#2F855A] hover:bg-[#225E3E] text-white border-[#2F855A]'
                    : 'bg-white hover:bg-[#EAE8E1] text-[#5A6573] border-[#DDDCD4]'
                }`}
                title={gaslessEnabled ? "Circle Paymaster Active (Sponsoring Gas)" : "Circle Paymaster Inactive (Pay Gas)"}
              >
                <Zap className={`h-3.5 w-3.5 ${gaslessEnabled ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">GASLESS: {gaslessEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <UnifiedBalance />
              <NotificationCenter />
              <ConnectButton chainStatus="none" showBalance={false} />
              <button
                onClick={() => setCurrentView('landing')}
                className="hidden lg:flex items-center gap-1 px-4 py-3 rounded-sm bg-white hover:bg-[#EAE8E1] text-[#1C2B3C] text-[10px] font-bold tracking-widest uppercase border border-[#DDDCD4] transition-all"
                title="Exit Console"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <BridgeModal />
      <GaslessReceiptModal />

      {/* Mobile nav */}
      <div className="md:hidden flex justify-around border-t border-[#E0DDD5] bg-[#EAE8E1] py-2 px-3">
        {!isDappMode ? (
          guestNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 min-w-[48px] min-h-[48px] rounded-sm text-[9.5px] font-bold tracking-wider transition-all ${
                  isActive ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </button>
            );
          })
        ) : (
          dappNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = dappTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setDappTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 min-w-[48px] min-h-[48px] rounded-sm text-[9.5px] font-bold tracking-wider transition-all ${
                  isActive ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label.split(' ')[0]}
              </button>
            );
          })
        )}
      </div>
    </header>
  );
}
