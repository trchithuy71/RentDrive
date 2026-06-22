'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

export default function LandingPageWrapper() {
  const router = useRouter();
  
  const handleLaunchApp = () => {
    router.push('/app');
  };
  
  const handleNavigate = (view: string) => {
    router.push(view === 'landing' ? '/' : `/${view}`);
  };

  return <LandingPage onLaunchApp={handleLaunchApp} onNavigate={handleNavigate} />;
}
