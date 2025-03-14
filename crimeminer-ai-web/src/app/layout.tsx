import { Metadata } from 'next';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'CrimeMiner AI - Advanced Evidence Analysis for Law Enforcement',
    template: '%s | CrimeMiner AI'
  },
  description: 'AI-powered digital evidence analysis platform for law enforcement, featuring entity extraction, evidence summarization, and pattern identification.',
  keywords: 'law enforcement, AI analysis, digital evidence, entity extraction, evidence management',
  openGraph: {
    title: 'CrimeMiner AI - Advanced Evidence Analysis',
    description: 'AI-powered digital evidence analysis platform for law enforcement',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
