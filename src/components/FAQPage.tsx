'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, HelpCircle, ShieldAlert, Cpu, Coins, Zap } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import RelatedNavigation from './RelatedNavigation';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'escrow' | 'telematics' | 'blockchain';
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqData: FAQItem[] = [
    {
      category: 'general',
      question: 'WHAT IS RENTDRIVE?',
      answer: 'RentDrive is a decentralized peer-to-peer (P2P) vehicle sharing platform where security deposits are locked transparently in Solidity smart contracts on the Arc Network rather than a central corporate database. Driving metrics are streamed live to calculate distance fees directly from this locked deposit.',
    },
    {
      category: 'telematics',
      question: 'HOW DOES THE PER-KILOMETER MICRO-BILLING WORK?',
      answer: 'While driving, the vehicle\'s simulated OBD-II terminal reports odometer updates to our telemetry api router. The smart contract calculates the distance delta and automatically deducts distance fees (e.g. 0.50 USDC/km) from your locked deposit balance, ensuring you pay exactly for what you use.',
    },
    {
      category: 'escrow',
      question: 'WHAT HAPPENS IN A COLLISION EVENT?',
      answer: 'The vehicle\'s on-board impact sensors monitor deceleration spikes. If an impact exceeds the safety threshold, a crash signal is dispatched to the contract, transitioning the status to "Disputed". This freezes the remaining deposit, allowing adjusters to resolve insurance claims using telemetry logs.',
    },
    {
      category: 'blockchain',
      question: 'HOW DO I SPONSOR TRANSACTION GAS FEES?',
      answer: 'RentDrive runs on the Arc Testnet where USDC is the native gas token. When connected via RainbowKit, transaction gas fees are sponsored automatically by the Circle Paymaster. You do not need Ether (ETH) or separate tokens to execute actions.',
    },
    {
      category: 'telematics',
      question: 'HOW CAN I USE THE SIMULATOR?',
      answer: 'To test RentDrive, launch the App Console and lease a vehicle from the Marketplace. Once confirmed, go to the "Telematics Simulator" tab where you can adjust vehicle speed, advance the odometer, or trigger simulated collisions to see on-chain contract reactions.',
    },
    {
      category: 'escrow',
      question: 'HOW DO I GET MY DEPOSIT REFUNDED?',
      answer: 'When checking out and completing a rental, the contract calculates final billing. The distance fees are released to the vehicle owner, and the remaining security deposit is immediately refunded back to your connected Web3 wallet.',
    },
    {
      category: 'blockchain',
      question: 'IS MY DATA SECURE?',
      answer: 'Yes. Telematics GPS coordinate streams are only stored ephemerally to execute oracle state calculations and trigger safety warnings. No personal details, driver license documents, or real-life identities are linked to your public wallet key on-chain.',
    }
  ];

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle },
    { id: 'general', label: 'General', icon: HelpCircle },
    { id: 'escrow', label: 'Escrow & Deposits', icon: Coins },
    { id: 'telematics', label: 'Telematics OBD-II', icon: Cpu },
    { id: 'blockchain', label: 'Gas & Blockchain', icon: Zap }
  ];

  const filteredFaqs = faqData.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-12 animate-fade-in">
      <Breadcrumbs items={[
        { label: 'Home', url: '/' },
        { label: 'FAQ', url: '/faq' }
      ]} />
      {/* Title */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-1 bg-[#1C2B3C] text-white px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-sm">
          <HelpCircle className="h-3.5 w-3.5" /> SYSTEM KNOWLEDGE BASE
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-[#1C2B3C] uppercase tracking-wide">
          FREQUENTLY ASKED QUESTIONS
        </h2>
        <p className="text-xs text-[#5A6573] font-semibold max-w-xl mx-auto">
          Everything you need to know about the decentralized telematics escrow system, stablecoin micro-billing, and simulator setup.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 border-b border-[#DDDCD4] pb-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setExpandedIndex(null); // Reset open accordion
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-sm text-[10px] font-bold tracking-wider uppercase border transition-all duration-300 ${
                isActive 
                  ? 'bg-[#1C2B3C] text-[#F2F1EC] border-[#1C2B3C] shadow-sm'
                  : 'bg-white text-[#5A6573] border-[#E0DDD5] hover:bg-[#F2F1EC]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative max-w-lg mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718096]">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g. How does gas sponsorship work? or What is the geofence rule?"
          className="w-full rounded-sm border border-[#DDDCD4] bg-white pl-10 pr-4 py-3.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] shadow-sm form-focus-ring"
        />
      </div>
      <p className="text-[9px] text-[#718096] text-center font-semibold mt-1.5 block">
        💡 Search through the system documentation by keywords, error codes, or operation types.
      </p>

      {/* Accordion List */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#DDDCD4] bg-[#F2F1EC]/30 rounded-sm text-[#718096] text-xs font-bold uppercase tracking-widest">
            No matching questions found in this category.
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className="rounded-sm border border-[#E0DDD5] bg-white overflow-hidden transition-all duration-300 hover:border-[#1C2B3C]/50"
              >
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full flex items-center justify-between p-5 text-left text-xs font-black text-[#1C2B3C] uppercase tracking-wider bg-white hover:bg-[#F2F1EC]/30 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#1C2B3C]/40" />
                    {faq.question}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#718096] transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </button>
                
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isExpanded ? 'max-h-40 border-t border-[#F2F1EC]' : 'max-h-0'
                }`}>
                  <div className="p-5 text-xs leading-relaxed text-[#5A6573] font-medium bg-[#F2F1EC]/20">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Support CTA */}
      <div className="text-center bg-[#EAE8E1] rounded-sm p-8 border border-[#DDDCD4] max-w-3xl mx-auto space-y-4">
        <h4 className="text-xs font-black text-[#1C2B3C] uppercase tracking-wider">
          STILL HAVE QUESTIONS?
        </h4>
        <p className="text-[11px] text-[#5A6573] font-semibold max-w-md mx-auto leading-relaxed">
          If you are looking for custom hardware integrations or need developer assistance deploying the smart contracts locally, reach out to our team.
        </p>
        <div>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              // Simulate navigation event via hash or direct component switch in parent
              const clickEvent = new CustomEvent('nav-view', { detail: 'contact' });
              window.dispatchEvent(clickEvent);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C2B3C] hover:bg-[#111A24] text-white text-[10px] font-bold tracking-widest uppercase rounded-sm transition-all duration-300 shadow-sm"
          >
            Open Developer Desk
          </a>
        </div>
      </div>

      {/* Dynamic Navigation Pathway Linker */}
      <RelatedNavigation currentView="faq" />
    </div>
  );
}
