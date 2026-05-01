'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isProducer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isProducer)) {
      router.push('/auth/login');
    }
  }, [user, loading, isProducer, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#67bed9', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user || !isProducer) return null;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
      {children}
    </div>
  );
}
