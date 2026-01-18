'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const disconnectWallet = useStore((state) => state.disconnectWallet);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user;
  const userType = session?.user?.userType;
  const walletAddress = session?.user?.walletAddress;
  const custodialPubKey = session?.user?.custodialPubKey;
  const kycStatus = session?.user?.kycStatus;

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
    // Clear Zustand wallet state
    disconnectWallet();
    
    // Clear NextAuth session
    await signOut({ redirect: false });
    
    // Note: Freighter wallet connection will be cleared on next page load
    // since useFreighterWallet checks session state
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

  const requireUserType = (allowedTypes: string[]) => {
    if (!isAuthenticated) return false;
    if (!userType) return false;
    return allowedTypes.includes(userType);
  };

  const isKycApproved = kycStatus === 'APPROVED';

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    userType,
    walletAddress,
    custodialPubKey,
    kycStatus,
    isKycApproved,
    login,
    logout,
    requireAuth,
    requireUserType,
  };
}
