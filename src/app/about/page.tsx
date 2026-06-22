import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import AboutPage from '@/components/AboutPage';

export const metadata: Metadata = {
  title: 'About Us | RentDrive - P2P Telematics Escrow',
  description: 'RentDrive is building the future of trustless vehicle sharing using smart contract escrow vaults, off-chain telemetry, and gasless stablecoin integrations.',
  alternates: {
    canonical: 'https://rentdrive.io/about',
  },
  openGraph: {
    title: 'About Us | RentDrive - P2P Telematics Escrow',
    description: 'RentDrive is building the future of trustless vehicle sharing using smart contract escrow vaults, off-chain telemetry, and gasless stablecoin integrations.',
    url: 'https://rentdrive.io/about',
    type: 'website',
  },
};

export default function AboutPageRoute() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'mainEntity': {
      '@type': 'Organization',
      'name': 'RentDrive Protocol',
      'url': 'https://rentdrive.io',
      'logo': 'https://rentdrive.io/logo.png',
      'description': 'A decentralized peer-to-peer car renting network with IoT telematic oracle guarantees and smart-contract payment structures.',
      'sameAs': [
        'https://twitter.com/rentdrive_io',
        'https://github.com/trchithuy71/RentDrive'
      ]
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageLayout currentView="about">
        <AboutPage />
      </PageLayout>
    </>
  );
}
