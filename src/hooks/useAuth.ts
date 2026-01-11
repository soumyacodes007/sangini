'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  const login = async (provider: 'credentials' | 'wallet', credentials?: {
    email?: string;
    password?: string;
    walletAddress?: string;
    signature?: string;
    nonce?: string;
  }) => {
    const result = await signIn(provider, {
      ...credentials,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const requireAuth = (callback?: () => void) => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
      return false;
    }
    if (isAuthenticated && callback) {
      callback();
    }
    return isAuthenticated;
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    login,
    logout,
    requireAuth,
  };
}
