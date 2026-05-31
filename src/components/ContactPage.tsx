'use client';

import React, { useState } from 'react';
import { Send, MessageSquare, Mail, Terminal } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate contact form submission
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setMessage('');
      setSubmitted(false);
      alert('Your message has been sent to our developer core team!');
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* Left Column: Form */}
      <div className="rounded-sm border border-[#E0DDD5] bg-white p-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-3 border-b border-[#F2F1EC] mb-6 flex items-center gap-2">
          <Terminal className="h-4.5 w-4.5" /> DEVELOPER SUPPORT DESK
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">FULL NAME</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SOPHIE CHEN"
              className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] uppercase tracking-wider"
            />
          </div>

          <div>
            <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">EMAIL ADDRESS</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="SUPPORT@RENTDRIVE.IO"
              className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] uppercase tracking-wider"
            />
          </div>

          <div>
            <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-bold focus:border-[#1C2B3C] focus:outline-none uppercase tracking-wide"
            >
              <option value="general">GENERAL ENQUIRY</option>
              <option value="bug">BUG REPORT / ERROR</option>
              <option value="feature">FEATURE SPECIFICATION</option>
              <option value="partnership">PARTNERSHIP</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">MESSAGE DETAILS</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="DESCRIBE YOUR INQUIRY IN DETAIL..."
              className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] uppercase tracking-wide"
            />
          </div>

          <button
            type="submit"
            disabled={submitted}
            className="w-full py-4 rounded-sm bg-[#1C2B3C] text-white font-bold text-[11px] tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm flex items-center justify-center gap-2"
          >
            {submitted ? 'DISPATCHING MESSAGE...' : (
              <>
                DISPATCH MESSAGE <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Direct Info & Socials */}
      <div className="space-y-6">
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-2 border-b border-[#F2F1EC]">
            DIRECT CONTACT INFO
          </h3>
          <p className="text-xs text-[#5A6573] leading-relaxed font-semibold">
            Have direct questions about smart contract integrations or telematics sensor hardware nodes? Reach out directly via our developer portal links:
          </p>

          <div className="space-y-3.5 text-xs font-bold text-[#1C2B3C] uppercase tracking-wider">
            <div className="flex items-center gap-3">
              <Mail className="h-4.5 w-4.5 text-[#5A6573]" />
              <span>CORE@RENTDRIVE.IO</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="h-4.5 w-4.5 text-[#5A6573]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">
                GITHUB CORE REPOSITORY
              </a>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4.5 w-4.5 text-[#5A6573]" />
              <span>TELEGRAM: @RENTDRIVE_CORE</span>
            </div>
          </div>
        </div>

        <div className="rounded-sm bg-[#EAE8E1] border border-[#DDDCD4] p-6 text-[10px] uppercase font-bold text-[#1C2B3C] leading-relaxed">
          <span>* GITHUB PULL REQUESTS FOR INTEGRATING NEW OBD-II SENSORS ARE ACTIVELY AUDITED EVERY THURSDAY.</span>
        </div>
      </div>
    </div>
  );
}
