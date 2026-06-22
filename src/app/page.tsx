import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import LandingPageWrapper from './LandingPageWrapper';

export const metadata: Metadata = {
  metadataBase: new URL('https://rentdrive.io'),
  title: 'RentDrive - P2P Telematics Escrow & Vehicle Sharing',
  description: 'Decentralized peer-to-peer vehicle sharing platform with real-time telematics escrow protection on the Arc Network.',
  keywords: ['P2P Car Sharing', 'Telematics Escrow', 'Web3 Car Rental', 'Circle Nanopayments', 'USDC Smart Contract', 'Arc Network'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'RentDrive - P2P Telematics Escrow & Vehicle Sharing',
    description: 'Decentralized peer-to-peer vehicle sharing platform with real-time telematics escrow protection on the Arc Network.',
    url: 'https://rentdrive.io',
    siteName: 'RentDrive',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RentDrive P2P Telematics Escrow platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentDrive - P2P Telematics Escrow & Vehicle Sharing',
    description: 'Decentralized peer-to-peer vehicle sharing platform with real-time telematics escrow protection on the Arc Network.',
    images: ['/og-image.png'],
    creator: '@rentdrive_io',
  },
};

export default function HomePage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'RentDrive',
      'url': 'https://rentdrive.io',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': 'https://rentdrive.io/docs?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'RentDrive Protocol',
      'operatingSystem': 'Web',
      'applicationCategory': 'BusinessApplication, FinanceApplication',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      }
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageLayout currentView="landing">
        <LandingPageWrapper />
      </PageLayout>
    </>
  );
}
