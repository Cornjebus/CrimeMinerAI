import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evidence Timeline | CrimeMiner AI',
  description: 'Chronological visualization of evidence references and entities for criminal investigations',
  keywords: 'criminal investigation, evidence timeline, forensic timeline, case visualization, entity timeline',
};

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 