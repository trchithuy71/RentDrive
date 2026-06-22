import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import DocsPage from '@/components/DocsPage';

export const metadata: Metadata = {
  title: 'Documentation | RentDrive - P2P Telematics Escrow',
  description: 'Technical manuals, smart contract specifications, and Circle Gateway off-chain nanopayments SDK documentation for RentDrive.',
  alternates: {
    canonical: 'https://rentdrive.io/docs',
  },
  openGraph: {
    title: 'Documentation | RentDrive - P2P Telematics Escrow',
    description: 'Technical manuals, smart contract specifications, and Circle Gateway off-chain nanopayments SDK documentation for RentDrive.',
    url: 'https://rentdrive.io/docs',
    type: 'article',
  },
};

export default function DocsPageRoute() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    'headline': 'RentDrive Protocol Developer Integration Guides',
    'description': 'Integration steps for telematics escrow smart contracts, OBD-II IoT data streams, and gasless Circle smart accounts.',
    'inLanguage': 'en-US',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': 'https://rentdrive.io/docs',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageLayout currentView="docs">
        <DocsPage />
      </PageLayout>
    </>
  );
}
