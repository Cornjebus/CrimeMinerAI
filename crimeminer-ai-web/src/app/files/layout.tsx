import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Evidence Files - CrimeMiner AI',
  description: 'Upload, manage, and analyze digital evidence files for law enforcement investigations.',
  keywords: 'evidence files, file management, digital evidence, file upload, evidence analysis',
};

export default function FilesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
} 