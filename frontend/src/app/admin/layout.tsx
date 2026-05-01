'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'ADMIN') return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {children}
    </div>
  );
}
