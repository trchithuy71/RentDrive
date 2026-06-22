import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import LegalPages from '@/components/LegalPages';

export const metadata: Metadata = {
  title: 'Terms of Service | RentDrive - P2P Telematics Escrow',
  description: 'Learn about terms of service governing smart contract escrow locking, autonomous speed penalties, and the finality of on-chain operations.',
  alternates: {
    canonical: 'https://rentdrive.io/terms',
  },
  openGraph: {
    title: 'Terms of Service | RentDrive - P2P Telematics Escrow',
    description: 'Learn about terms of service governing smart contract escrow locking, autonomous speed penalties, and the finality of on-chain operations.',
    url: 'https://rentdrive.io/terms',
    type: 'website',
  },
};

export default function TermsPageRoute() {
  return (
    <PageLayout currentView="terms">
      <LegalPages defaultTab="terms" />
    </PageLayout>
  );
}
