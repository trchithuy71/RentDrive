import React from 'react';
import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import ContactPage from '@/components/ContactPage';

export const metadata: Metadata = {
  title: 'Contact | RentDrive - P2P Telematics Escrow',
  description: 'Reach out to the RentDrive Core Team for integration partnerships, custom telematics integrations, or technical support requests.',
  alternates: {
    canonical: 'https://rentdrive.io/contact',
  },
  openGraph: {
    title: 'Contact | RentDrive - P2P Telematics Escrow',
    description: 'Reach out to the RentDrive Core Team for integration partnerships, custom telematics integrations, or technical support requests.',
    url: 'https://rentdrive.io/contact',
    type: 'website',
  },
};

export default function ContactPageRoute() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    'description': 'Contact details and communication panel for the RentDrive Protocol team.',
    'mainEntity': {
      '@type': 'Organization',
      'name': 'RentDrive Support & Integrations',
      'email': 'support@rentdrive.io',
      'contactPoint': {
        '@type': 'ContactPoint',
        'contactType': 'technical support',
        'email': 'support@rentdrive.io',
        'url': 'https://rentdrive.io/contact'
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageLayout currentView="contact">
        <ContactPage />
      </PageLayout>
    </>
  );
}
