import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import FAQPage from '@/components/FAQPage';

export const metadata: Metadata = {
  title: 'FAQ | RentDrive - P2P Telematics Escrow',
  description: 'Frequently asked questions about automated speed-limit triggers, geofence violations, collision settlements, and Circle smart account setups on RentDrive.',
  alternates: {
    canonical: 'https://rentdrive.io/faq',
  },
  openGraph: {
    title: 'FAQ | RentDrive - P2P Telematics Escrow',
    description: 'Frequently asked questions about automated speed-limit triggers, geofence violations, collision settlements, and Circle smart account setups on RentDrive.',
    url: 'https://rentdrive.io/faq',
    type: 'website',
  },
};

export default function FAQPageRoute() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'How does the telematic escrow system work?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'When you lease a vehicle, a security deposit is locked in the smart contract escrow. Real-time OBD-II telemetry streams speed and geofence updates. If speed thresholds are breached, penalty micro-deductions are calculated off-chain and settled instantly using USDC nanopayments.'
        }
      },
      {
        '@type': 'Question',
        'name': 'What happens if a collision is detected?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'The virtual crash sensors automatically flag extreme impact events. This triggers a smart contract state change to "Disputed", freezing the escrow deposit and preventing checkout refunds until adjusters resolve the dispute.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Can I pay for transactions gaslessly?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes. By toggling the Gasless mode in the dashboard, the application uses Circle Developer-Controlled Wallets and paymaster logic to sponsor gas fees, abstracting blockchain friction entirely.'
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageLayout currentView="faq">
        <FAQPage />
      </PageLayout>
    </>
  );
}
