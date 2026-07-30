'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { authApi } from './api';

export interface OrganizationMembership {
  id: string;
  role: 'ORG_ADMIN' | 'PRODUCER' | 'STAFF';
  status: 'ACTIVE' | 'INACTIVE';
  organization: {
    id: string; name: string; slug: string; logoUrl?: string | null;
    primaryColor?: string | null; secondaryColor?: string | null;
    website?: string | null; instagram?: string | null;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'PRODUCER' | 'STAFF' | 'ADMIN';
  platformRole: 'MEMBER' | 'SUPER_ADMIN';
  organizationMemberships?: OrganizationMembership[];
  avatarUrl?: string | null;
  isVerified: boolean;
  clubMembership?: {
    isMember: boolean;
    isActive: boolean;
    canUseBenefit: boolean;
    discountPercentage: string | null;
    label: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  isProducer: boolean;
  isStaff: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (token) {
      authApi
        .me()
        .then((res) => setUser(res.data))
        .catch(() => Cookies.remove('access_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authApi.login(credentials);
    Cookies.set('access_token', res.data.accessToken, { secure: true, sameSite: 'strict' });
    const profile = await authApi.me();
    setUser(profile.data);
  };

  const logout = async () => {
    await authApi.logout();
    Cookies.remove('access_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isProducer: user?.role === 'PRODUCER' || user?.role === 'ADMIN',
        isStaff: user?.role === 'STAFF' || user?.role === 'PRODUCER' || user?.role === 'ADMIN',
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
