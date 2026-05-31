'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Car, ShieldAlert, Cpu, Landmark, Sparkles, BookOpen, HelpCircle, Users, Mail, LogOut, ArrowRight } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  dappTab: string;
  setDappTab: (tab: string) => void;
}

export default function Navbar({ currentView, setCurrentView, dappTab, setDappTab }: NavbarProps) {
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

      {/* Mobile nav */}
      <div className="md:hidden flex justify-around border-t border-[#E0DDD5] bg-[#EAE8E1] py-2.5 px-4">
        {!isDappMode ? (
          guestNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-sm text-[9px] font-bold tracking-wider transition-all ${
                  isActive ? 'text-[#1C2B3C]' : 'text-[#718096] hover:text-[#4A5568]'
                }`}
              >
                <Icon className="h-4 w-4" />
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
                className={`flex flex-col items-center gap-1 p-2 rounded-sm text-[9px] font-bold tracking-wider transition-all ${
                  isActive ? 'text-[#1C2B3C]' : 'text-[#718096] hover:text-[#4A5568]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label.split(' ')[0]}
              </button>
            );
          })
        )}
      </div>
    </header>
  );
}
