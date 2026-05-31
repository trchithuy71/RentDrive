'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqData: FAQItem[] = [
    {
      question: 'WHAT IS RENTDRIVE?',
      answer: 'RentDrive is a peer-to-peer vehicle sharing platform where security deposits are locked transparently in smart contract escrows on the Arc Network rather than a central corporate ledger. Telematics are integrated directly on-chain.',
    },
    {
      question: 'HOW DOES THE PER-KILOMETER MICRO-BILLING WORK?',
      answer: 'While driving, the vehicle\'s simulated OBD-II terminal reports odometer updates to our Next.js telemetry router every 3 seconds. The smart contract calculates the difference and automatically deducts distance fees from your locked deposit balance.',
    },
    {
      question: 'WHAT HAPPENS IN A COLLISION EVENT?',
      answer: 'The virtual vehicle impact sensor dispatches an instant signal to the contract. The contract state automatically transitions to "Disputed", freezing the escrow and preventing any further withdrawals until administrative adjusters allocate the balance.',
    },
    {
      question: 'HOW DO I SPONSOR TRANSACTION GAS FEES?',
      answer: 'RentDrive runs on the Arc Testnet where USDC is the native gas token. When connected via RainbowKit, transaction gas fees are sponsor-sponsored or settled automatically in USDC. You can get testnet USDC from the faucet link in the footer.',
    },
    {
      question: 'HOW DO I USE THE SIMULATOR?',
      answer: 'Navigate to the Marketplace, select any fleet vehicle, and lease it. Once confirmed, open the "Telematics Simulator" tab. You can drag the speed slider to breach speed limits or trigger an impact collision to observe on-chain responses.',
    },
  ];

  const filteredFaqs = faqData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Title */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1 bg-[#1C2B3C] text-white px-2.5 py-1 text-[8px] font-bold tracking-widest uppercase mb-4 rounded-sm">
          <HelpCircle className="h-3.5 w-3.5" /> FREQUENTLY ASKED QUESTIONS
        </span>
        <h2 className="text-3xl font-black text-[#1C2B3C] uppercase tracking-wide">
          SYSTEM FAQS
        </h2>
      </div>

      {/* Search Input */}
      <div className="relative mb-8 max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718096]">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH FREQUENT QUESTIONS..."
          className="w-full rounded-sm border border-[#DDDCD4] bg-white pl-10 pr-4 py-3.5 text-xs text-[#1C2B3C] font-bold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] shadow-sm uppercase tracking-wide"
        />
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 text-[#718096] text-xs font-semibold uppercase tracking-wider">
            No matching questions found.
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className="rounded-sm border border-[#E0DDD5] bg-white overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full flex items-center justify-between p-5 text-left text-xs font-black text-[#1C2B3C] uppercase tracking-wider bg-white hover:bg-[#F2F1EC]/40"
                >
                  <span>{faq.question}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                {isExpanded && (
                  <div className="p-5 border-t border-[#F2F1EC] text-xs leading-relaxed text-[#5A6573] font-medium bg-[#F2F1EC]/20">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
