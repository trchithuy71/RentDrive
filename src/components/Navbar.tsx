'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Car, ShieldAlert, Cpu, Landmark, Sparkles, BookOpen, HelpCircle, Users, Mail, LogOut, ArrowRight, Zap, Download, ArrowRightLeft, Menu, X, ExternalLink } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { id: 'agent', label: 'AGENT OS', icon: Sparkles },
    { id: 'swap', label: 'SWAP', icon: ArrowRightLeft },
    { id: 'rentals', label: 'MY RENTALS', icon: ShieldAlert },
    { id: 'owner', label: 'OWNER PORTAL', icon: Landmark },
    { id: 'simulator', label: 'TELEMATICS SIMULATOR', icon: Cpu },
  ];

  const isDappMode = currentView === 'app';

  return (
    <>
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
        <Link 
          href="/"
          className="flex items-center gap-3.5 cursor-pointer animate-fade-in" 
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#1C2B3C] text-[#F2F1EC] shadow-sm">
            <Car className="h-5.5 w-5.5 stroke-[1.8]" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-lg sm:text-xl font-black tracking-widest text-[#1C2B3C] font-sans leading-none">RENTDRIVE</span>
            <span className="hidden sm:block text-[9px] text-[#5A6573] font-mono tracking-widest uppercase mt-1">ESCROW & DEPIN PLATFORM</span>
          </div>
        </Link>

        {/* Dynamic Navigation Tabs */}
        {!isDappMode ? (
          /* Guest Mode Navigation */
          <nav className="hidden md:flex items-center gap-1.5 rounded-sm bg-[#E7E5DD]/70 p-1 border border-[#DCDAD0]/80">
            {guestNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const itemHref = item.id === 'landing' ? '/' : `/${item.id}`;
              return (
                <Link
                  key={item.id}
                  href={itemHref}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-sm text-[10px] font-bold tracking-widest transition-all ${
                    isActive
                      ? 'bg-[#1C2B3C] text-white shadow-sm'
                      : 'text-[#4A5568] hover:text-[#1C2B3C] hover:bg-[#DCDAD0]/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
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
        <div className="flex items-center gap-2 md:gap-4">
          {!isDappMode ? (
            <>
              <Link
                href="/app"
                className="hidden lg:flex items-center gap-2 px-5 py-3 rounded-sm bg-[#1C2B3C] text-white text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm"
              >
                LAUNCH APP <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {/* Mobile Hamburger menu trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden flex items-center justify-center h-11 w-11 rounded-sm bg-white hover:bg-[#EAE8E1] border border-[#DDDCD4] text-[#1C2B3C] transition-all"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setGaslessEnabled(!gaslessEnabled)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase border transition-all ${
                  gaslessEnabled
                    ? 'bg-[#2F855A] hover:bg-[#225E3E] text-white border-[#2F855A]'
                    : 'bg-white hover:bg-[#EAE8E1] text-[#5A6573] border-[#DDDCD4]'
                }`}
                title={gaslessEnabled ? "Circle Paymaster Active (Sponsoring Gas)" : "Circle Paymaster Inactive (Pay Gas)"}
              >
                <Zap className={`h-3.5 w-3.5 ${gaslessEnabled ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">GASLESS: {gaslessEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <div className="hidden md:block">
                <UnifiedBalance />
              </div>
              <NotificationCenter />
              <ConnectButton chainStatus="none" showBalance={false} />
              <Link
                href="/"
                className="hidden lg:flex items-center gap-1 px-4 py-3 rounded-sm bg-white hover:bg-[#EAE8E1] text-[#1C2B3C] text-[10px] font-bold tracking-widest uppercase border border-[#DDDCD4] transition-all"
                title="Exit Console"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Link>
              {/* Mobile Hamburger menu trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden flex items-center justify-center h-11 w-11 rounded-sm bg-white hover:bg-[#EAE8E1] border border-[#DDDCD4] text-[#1C2B3C] transition-all"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Mobile Side Drawer Overlay */}
    <div 
      className={`fixed inset-0 z-[100] bg-[#1C2B3C]/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <div 
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-[#F2F1EC] border-l border-[#E0DDD5] p-6 shadow-2xl transition-transform duration-300 flex flex-col justify-between overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E0DDD5]">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#1C2B3C] text-white">
                <Car className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#1C2B3C]">RENTDRIVE</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 text-[#718096] hover:text-[#1C2B3C] rounded-sm hover:bg-[#E7E5DD]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* DApp Switcher Mode */}
          <div className="rounded-sm border border-[#DDDCD4] bg-white p-4 space-y-3.5">
            <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest">CONSOLE MODE</span>
            <div className="flex gap-2">
              <Link 
                href="/"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                }}
                className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-widest rounded-sm border transition-all ${
                  !isDappMode 
                    ? 'bg-[#1C2B3C] text-white border-[#1C2B3C]' 
                    : 'bg-[#F2F1EC] text-[#5A6573] border-[#DDDCD4] hover:bg-[#EAE8E1]'
                }`}
              >
                GUEST
              </Link>
              <Link 
                href="/app"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                }}
                className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-widest rounded-sm border transition-all ${
                  isDappMode 
                    ? 'bg-[#1C2B3C] text-white border-[#1C2B3C]' 
                    : 'bg-[#F2F1EC] text-[#5A6573] border-[#DDDCD4] hover:bg-[#EAE8E1]'
                }`}
              >
                WEB3 APP
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest px-2 mb-2">NAVIGATION</span>
            {!isDappMode ? (
              guestNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const itemHref = item.id === 'landing' ? '/' : `/${item.id}`;
                return (
                  <Link
                    key={item.id}
                    href={itemHref}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all ${
                      isActive 
                        ? 'bg-[#1C2B3C] text-white' 
                        : 'text-[#4A5568] hover:text-[#1C2B3C] hover:bg-[#E7E5DD]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })
            ) : (
              dappNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = dappTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDappTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all ${
                      isActive 
                        ? 'bg-[#1C2B3C] text-white' 
                        : 'text-[#4A5568] hover:text-[#1C2B3C] hover:bg-[#E7E5DD]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })
            )}
          </nav>

          {/* Mobile Controller Widget (Only when in DApp Mode) */}
          {isDappMode && (
            <div className="space-y-3.5 border-t border-[#E0DDD5] pt-5">
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest px-2">CONSOLE CONTROLS</span>
              
              {/* Gasless trigger */}
              <button
                onClick={() => setGaslessEnabled(!gaslessEnabled)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase border transition-all ${
                  gaslessEnabled
                    ? 'bg-[#2F855A] text-white border-[#2F855A]'
                    : 'bg-white text-[#5A6573] border-[#DDDCD4]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> GASLESS RPC
                </span>
                <span>{gaslessEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {/* Mobile Unified Balance display */}
              <div className="bg-white border border-[#DDDCD4] rounded-sm p-4 text-[10px] space-y-2">
                <UnifiedBalance />
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-[#E0DDD5] pt-4 mt-6 text-center text-[8.5px] text-[#718096] font-mono tracking-widest uppercase space-y-2">
          <div className="flex flex-col gap-1 text-left">
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="hover:text-[#1C2B3C] transition-colors flex items-center gap-1.5 font-bold">
              ARC SCAN EXPLORER <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="hover:text-[#1C2B3C] transition-colors flex items-center gap-1.5 font-bold">
              CIRCLE FAUCET <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="pt-2 text-center border-t border-[#E0DDD5]/50">
            © 2026 RENTDRIVE PLATFORM
          </div>
        </div>
      </div>
    </div>

    {/* Mobile bottom nav redesign: hide in guest mode, 5 clean tabs in Dapp mode */}
    {isDappMode && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-[#E0DDD5] bg-[#EAE8E1]/90 backdrop-blur-md py-2 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-lg">
        <button
          onClick={() => setDappTab('marketplace')}
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 min-w-[48px] min-h-[48px] rounded-sm text-[9px] font-bold tracking-wider transition-all ${
            dappTab === 'marketplace' ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <Car className="h-4.5 w-4.5" />
          <span>MARKET</span>
        </button>

        <button
          onClick={() => setDappTab('agent')}
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 min-w-[48px] min-h-[48px] rounded-sm text-[9px] font-bold tracking-wider transition-all ${
            dappTab === 'agent' ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <Sparkles className="h-4.5 w-4.5" />
          <span>AGENT</span>
        </button>

        <button
          onClick={() => setDappTab('swap')}
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 min-w-[48px] min-h-[48px] rounded-sm text-[9px] font-bold tracking-wider transition-all ${
            dappTab === 'swap' ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <ArrowRightLeft className="h-4.5 w-4.5" />
          <span>SWAP</span>
        </button>

        <button
          onClick={() => setDappTab('rentals')}
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 min-w-[48px] min-h-[48px] rounded-sm text-[9px] font-bold tracking-wider transition-all ${
            dappTab === 'rentals' ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <ShieldAlert className="h-4.5 w-4.5" />
          <span>RENTALS</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 min-w-[48px] min-h-[48px] rounded-sm text-[9px] font-bold tracking-wider transition-all ${
            isMobileMenuOpen ? 'text-[#1C2B3C] bg-[#DCDAD0]/35' : 'text-[#718096] hover:text-[#4A5568]'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <Menu className="h-4.5 w-4.5" />
          <span>MORE</span>
        </button>
      </div>
    )}

    <BridgeModal />
    <GaslessReceiptModal />
  </>
);
}
