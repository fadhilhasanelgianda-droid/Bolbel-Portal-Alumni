'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../client/api.ts';
import { DataStoreProvider } from '../../domain/dataStore.tsx';
import type { User, UserRole } from '../../domain/types.ts';
import { LoginPage } from './LoginPage.tsx';

type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: User };

interface SessionUserDto {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  rosterId: string | null;
}

const toUser = (u: SessionUserDto): User => ({
  id: u.id,
  email: u.email,
  role: u.role,
  fullName: u.fullName,
  rosterId: u.rosterId ?? undefined,
  active: true,
});

/** Shows the login page until the session cookie checks out, then mounts the data store for that user. */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  const loadSession = useCallback(async () => {
    try {
      const { user } = await api<{ user: SessionUserDto }>('GET', '/api/auth/me');
      setAuth({ status: 'authenticated', user: toUser(user) });
    } catch {
      setAuth({ status: 'anonymous' });
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    await api('POST', '/api/auth/logout').catch(() => undefined);
    setAuth({ status: 'anonymous' });
  }, []);

  const handleUnauthorized = useCallback(() => setAuth({ status: 'anonymous' }), []);

  if (auth.status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#595959]">Memuat…</div>;
  }
  if (auth.status === 'anonymous') {
    return <LoginPage onAuthenticated={() => void loadSession()} />;
  }
  return (
    // key: a different user must never see the previous user's cached data
    <DataStoreProvider key={auth.user.id} user={auth.user} onLogout={logout} onUnauthorized={handleUnauthorized}>
      {children}
    </DataStoreProvider>
  );
};
