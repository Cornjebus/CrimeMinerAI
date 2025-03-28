'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCasePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cases');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  );
} 