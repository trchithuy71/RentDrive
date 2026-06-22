'use client';

import React, { useState } from 'react';
import { Send, MessageSquare, Mail, Terminal, ShieldAlert, CheckCircle } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import RelatedNavigation from './RelatedNavigation';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    
    // Simulate contact form submission API call
    setTimeout(() => {
      setName('');
      setEmail('');
      setMessage('');
      setCategory('general');
      setSubmitted(false);
      setSuccess(true);
      
      // Clear success banner after 4 seconds
      setTimeout(() => setSuccess(false), 4000);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-12">
      <Breadcrumbs items={[
        { label: 'Home', url: '/' },
        { label: 'Contact', url: '/contact' }
      ]} />
      {/* Title */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCDAD0] bg-white px-4 py-1.5 text-[10px] font-black tracking-widest text-[#1C2B3C] uppercase shadow-sm">
          <Terminal className="h-3.5 w-3.5" /> DEVELOPER SUPPORT DESK
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-[#1C2B3C] uppercase tracking-wide">
          GET IN TOUCH
        </h1>
        <p className="text-xs text-[#5A6573] font-semibold max-w-xl mx-auto">
          Need hardware integration assistance or want to join the pilot testing phase? Dispatch a message directly to our core developers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 rounded-sm border border-[#E0DDD5] bg-white p-6 md:p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#1C2B3C]" />
          
          <h3 className="text-xs font-black uppercase tracking-widest text-[#1C2B3C] pb-3 border-b border-[#F2F1EC] mb-6 flex items-center gap-2">
            <Mail className="h-4.5 w-4.5" /> DISPATCH INQUIRY
          </h3>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm text-green-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 animate-slide-down">
              <CheckCircle className="h-4.5 w-4.5 shrink-0" />
              <span>Your message has been dispatched to the developer team. We will write back soon!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. SOPHIE CHEN"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-3 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] tracking-wide"
                />
              </div>

              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E.g. SOPHIE@DOMAIN.COM"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-3 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] tracking-wide"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-3 text-xs text-[#1C2B3C] font-bold focus:border-[#1C2B3C] focus:outline-none uppercase tracking-wide"
              >
                <option value="general">GENERAL ENQUIRY</option>
                <option value="bug">BUG REPORT / INTERACTION ERROR</option>
                <option value="feature">FEATURE SPECIFICATION REQUEST</option>
                <option value="hardware">OBD-II HARDWARE PILOT</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">MESSAGE DETAILS</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="DESCRIBE YOUR INQUIRY OR HARDWARE SPECIFICATIONS..."
                className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-3 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] tracking-wide"
              />
            </div>

            <button
              type="submit"
              disabled={submitted}
              className="w-full py-4 bg-[#1C2B3C] hover:bg-[#111A24] text-white font-bold text-[11px] tracking-widest uppercase transition-all duration-200 border border-[#1C2B3C] shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitted ? 'DISPATCHING INQUIRY...' : (
                <>
                  SEND MESSAGE <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Direct Info & Socials */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-sm border border-[#E0DDD5] bg-white p-6 md:p-8 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC]">
              DIRECT COMMS CHANNEL
            </h3>
            
            <p className="text-xs text-[#5A6573] leading-relaxed font-semibold">
              Have questions about integrating our smart contract escrows into your fleet operations or configuring telematics listeners? Reach out directly:
            </p>

            <div className="space-y-4 text-xs font-bold text-[#1C2B3C] uppercase tracking-wider">
              <a 
                href="mailto:core@rentdrive.io" 
                className="flex items-center gap-3.5 p-3 rounded-sm border border-[#F2F1EC] hover:bg-[#F2F1EC]/30 hover:border-[#DDDCD4] transition-all"
              >
                <Mail className="h-4.5 w-4.5 text-[#718096]" />
                <span>CORE@RENTDRIVE.IO</span>
              </a>
              
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3.5 p-3 rounded-sm border border-[#F2F1EC] hover:bg-[#F2F1EC]/30 hover:border-[#DDDCD4] transition-all"
              >
                <svg className="h-4.5 w-4.5 text-[#718096]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>GITHUB CORE REPOSITORY</span>
              </a>

              <div className="flex items-center gap-3.5 p-3 rounded-sm border border-[#F2F1EC]">
                <MessageSquare className="h-4.5 w-4.5 text-[#718096]" />
                <span>TELEGRAM: @RENTDRIVE_CORE</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm bg-[#EAE8E1] border border-[#DDDCD4] p-6 text-[10px] uppercase font-bold text-[#1C2B3C] leading-relaxed flex gap-2">
            <ShieldAlert className="h-4 w-4 text-[#718096] shrink-0" />
            <span>OBD-II vehicle integration pull requests are reviewed by our engineering cores every Thursday.</span>
          </div>
        </div>
      </div>

      {/* Comms Discovery Router */}
      <RelatedNavigation currentView="contact" />
    </div>
  );
}
