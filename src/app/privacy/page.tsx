import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import LegalPages from '@/components/LegalPages';

export const metadata: Metadata = {
  title: 'Privacy Policy | RentDrive - P2P Telematics Escrow',
  description: 'Understand how RentDrive stores and handles vehicle telemetry, GPS coordinate parameters, and transaction records on the public block explorer.',
  alternates: {
    canonical: 'https://rentdrive.io/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | RentDrive - P2P Telematics Escrow',
    description: 'Understand how RentDrive stores and handles vehicle telemetry, GPS coordinate parameters, and transaction records on the public block explorer.',
    url: 'https://rentdrive.io/privacy',
    type: 'website',
  },
};

export default function PrivacyPageRoute() {
  return (
    <PageLayout currentView="privacy">
      <LegalPages defaultTab="privacy" />
    </PageLayout>
  );
}
