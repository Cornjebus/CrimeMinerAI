import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI Analysis - CrimeMiner AI',
  description: 'Analyze evidence text with AI to extract entities, summarize content, analyze sentiment, and identify patterns.',
  keywords: 'AI analysis, entity extraction, evidence summarization, sentiment analysis, pattern identification',
};

export default function AnalyzeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
} 