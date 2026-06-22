import React from 'react';
import type { Metadata } from 'next';
import AppPageClient from './AppPageClient';

export const metadata: Metadata = {
  title: 'Workspace Dashboard | RentDrive',
  description: 'Manage active leases, monitor OBD-II telemetry parameters, execute swaps, and interact with the AI agent OS on RentDrive.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppPage() {
  return <AppPageClient />;
}
