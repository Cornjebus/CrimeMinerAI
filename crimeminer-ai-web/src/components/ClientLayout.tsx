'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';

const queryClient = new QueryClient();

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
} 