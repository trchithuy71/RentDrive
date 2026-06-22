'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, HelpCircle, Sparkles, Car, Terminal, Mail } from 'lucide-react';

interface RelatedNavigationProps {
  currentView: 'landing' | 'docs' | 'faq' | 'about' | 'contact' | 'privacy' | 'terms' | 'app';
}

export default function RelatedNavigation({ currentView }: RelatedNavigationProps) {
  // Define dynamic recommendations based on current page view
  const getLinks = () => {
    switch (currentView) {
      case 'landing':
        return [
          {
            title: 'Developer Documentation',
            description: 'Explore the DePIN IoT telemetry specifications and smart contract ABI protocols.',
            icon: BookOpen,
            href: '/docs',
            cta: 'Read Documentation',
          },
          {
            title: 'FAQ Knowledge Base',
            description: 'Understand safety deposit locks, collision freezes, and stablecoin transactions.',
            icon: HelpCircle,
            href: '/faq',
            cta: 'Browse Help Center',
          },
          {
            title: 'Launch App Console',
            description: 'Acquire vehicle rentals, trigger telematic simulations, and inspect Circle RPC transactions.',
            icon: Car,
            href: '/app',
            cta: 'Enter Console',
            primary: true,
          },
        ];
      case 'docs':
        return [
          {
            title: 'Telematic Sandbox Simulator',
            description: 'Test live speed breaches and simulated OBD-II coordinate streams directly in the app console.',
            icon: Sparkles,
            href: '/app', // We guide them to app where simulator resides
            cta: 'Launch Simulator',
            primary: true,
          },
          {
            title: 'Frequently Asked Questions',
            description: 'Get immediate answers about gas fee sponsorship and off-chain telemetry relays.',
            icon: HelpCircle,
            href: '/faq',
            cta: 'Read FAQ',
          },
          {
            title: 'Developer Desk Support',
            description: 'Submit technical inquiries or register OBD-II hardware pilot integrations.',
            icon: Mail,
            href: '/contact',
            cta: 'Contact Support',
          },
        ];
      case 'faq':
        return [
          {
            title: 'Smart Contract API Manual',
            description: 'Review Solidity function signatures, events logging, and escrow parameters.',
            icon: BookOpen,
            href: '/docs',
            cta: 'Open API Reference',
          },
          {
            title: 'Get Support Ticket',
            description: 'Need assistance deploying contracts or integrating physical IoT units?',
            icon: Mail,
            href: '/contact',
            cta: 'Contact Developers',
          },
          {
            title: 'Interactive Console App',
            description: 'Start a gasless car lease or query public unified balances on Arc Scan.',
            icon: Car,
            href: '/app',
            cta: 'Launch Workspace',
            primary: true,
          },
        ];
      case 'about':
        return [
          {
            title: 'Review System Specs',
            description: 'Examine detailed DePIN IoT frameworks, schemas, and smart contract flows.',
            icon: BookOpen,
            href: '/docs',
            cta: 'Read Technical Manuals',
          },
          {
            title: 'Inquire Partnerships',
            description: 'Join the pilot test network and launch customized vehicle escrow policies.',
            icon: Mail,
            href: '/contact',
            cta: 'Contact Core Developers',
          },
          {
            title: 'Try P2P Escrow',
            description: 'Connect wallet and lease simulated vehicle fleet items with gasless paymaster.',
            icon: Car,
            href: '/app',
            cta: 'Enter Platform App',
            primary: true,
          },
        ];
      case 'contact':
        return [
          {
            title: 'Search System FAQ',
            description: 'Resolve onboarding or RPC issues instantly via our detailed knowledge base.',
            icon: HelpCircle,
            href: '/faq',
            cta: 'Search FAQ',
          },
          {
            title: 'Developer Docs Hub',
            description: 'Access compiling commands, SDK guides, and sample telemetry packet structures.',
            icon: BookOpen,
            href: '/docs',
            cta: 'Open Documentation',
          },
          {
            title: 'Interactive Platform App',
            description: 'Access vehicle escrow marketplace and launch telematic simulations gaslessly.',
            icon: Car,
            href: '/app',
            cta: 'Launch Console',
            primary: true,
          },
        ];
      default: // privacy, terms, legal
        return [
          {
            title: 'Developer Center',
            description: 'Examine technical documentation and security deposit smart contracts.',
            icon: BookOpen,
            href: '/docs',
            cta: 'View Manuals',
          },
          {
            title: 'FAQ Knowledge Base',
            description: 'Browse detailed articles explaining collateral rules and crash freezes.',
            icon: HelpCircle,
            href: '/faq',
            cta: 'Read Help Articles',
          },
          {
            title: 'Go back to Homepage',
            description: 'Return to the main page to preview simulated OBD-II live dashboards.',
            icon: Terminal,
            href: '/',
            cta: 'Return Home',
            primary: true,
          },
        ];
    }
  };

  const links = getLinks();

  return (
    <section className="mt-16 border-t border-[#DDDCD4] pt-12 space-y-8">
      {/* Title */}
      <div className="text-left space-y-2">
        <span className="text-[8px] text-[#718096] font-bold uppercase tracking-widest block font-mono">
          RECOMMENDED PATHWAYS & NEXT STEPS
        </span>
        <h3 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wide">
          CONTINUE YOUR JOURNEY
        </h3>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <div 
              key={link.title} 
              className={`p-6 border rounded-sm transition-all duration-300 flex flex-col justify-between hover:shadow-md relative overflow-hidden group ${
                link.primary 
                  ? 'bg-gradient-to-br from-[#1C2B3C] to-[#2D3E50] border-[#1C2B3C] text-white' 
                  : 'bg-white border-[#DDDCD4] text-[#1C2B3C]'
              }`}
            >
              {link.primary && (
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-radial from-white/10 to-transparent blur-xl pointer-events-none" />
              )}
              
              <div className="space-y-3.5">
                <div className={`h-8 w-8 flex items-center justify-center rounded-sm border ${
                  link.primary 
                    ? 'bg-white/10 border-white/20 text-white' 
                    : 'bg-[#F2F1EC] border-[#DDDCD4] text-[#1C2B3C]'
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${
                    link.primary ? 'text-white' : 'text-[#1C2B3C]'
                  }`}>
                    {link.title}
                  </h4>
                  <p className={`text-[11px] leading-relaxed font-semibold mt-1.5 ${
                    link.primary ? 'text-slate-300' : 'text-[#5A6573]'
                  }`}>
                    {link.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-dashed border-current/10">
                <Link 
                  href={link.href}
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                    link.primary 
                      ? 'text-white hover:text-slate-200' 
                      : 'text-[#1C2B3C] hover:text-[#5A6573]'
                  }`}
                >
                  {link.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
