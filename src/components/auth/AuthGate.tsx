'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../../client/api.ts';
import { DataStoreProvider } from '../../domain/dataStore.tsx';
import type { User, UserRole } from '../../domain/types.ts';
import { LoginPage } from './LoginPage.tsx';

type AuthState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'anonymous' } | { status: 'authenticated'; user: User };

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
    } catch (err) {
      // Only a 401 means "not signed in"; a network/server failure must not look like an expired session
      if (err instanceof ApiError && err.status === 401) setAuth({ status: 'anonymous' });
      else setAuth({ status: 'error', message: err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.' });
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
  if (auth.status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[#595959]">
        <p role="alert">{auth.message}</p>
        <button
          onClick={() => {
            setAuth({ status: 'loading' });
            void loadSession();
          }}
          className="px-4 py-2 rounded-lg bg-[#BD214C] text-white font-semibold"
        >
          Coba lagi
        </button>
      </div>
    );
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
