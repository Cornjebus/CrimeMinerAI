'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { initApi, api } from '@/lib/api';

const queryClient = new QueryClient();

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  
  // Initialize the API client when the component mounts
  useEffect(() => {
    const setupApi = async () => {
      try {
        // Try to connect to the API
        const initialized = await initApi();
        
        if (initialized) {
          console.log('API connected successfully to:', api.defaults.baseURL);
          setApiStatus('connected');
        } else {
          console.warn('API initialization failed, setting fallback URL');
          // Force a fallback if the API doesn't respond
          api.defaults.baseURL = 'http://localhost:4000';
          setApiStatus('error');
        }
      } catch (error) {
        console.error('Error initializing API:', error);
        // Set a fallback URL for the API
        api.defaults.baseURL = 'http://localhost:4000';
        setApiStatus('error');
      }
    };
    
    setupApi();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        {apiStatus === 'loading' ? (
          <div className="flex items-center justify-center h-24 bg-yellow-50 border-b border-yellow-200">
            <p className="text-yellow-700">Connecting to backend server...</p>
          </div>
        ) : apiStatus === 'error' ? (
          <div className="flex items-center justify-center h-24 bg-amber-50 border-b border-amber-200">
            <p className="text-amber-700">
              Warning: Connected to backup server. Some features may be limited.
            </p>
          </div>
        ) : null}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
} 