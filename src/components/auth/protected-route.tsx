'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: string[];
  requireKyc?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedTypes,
  requireKyc = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userType, isKycApproved } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedTypes && userType && !allowedTypes.includes(userType)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-center">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  if (requireKyc && !isKycApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <h2 className="text-2xl font-bold mb-2">KYC Required</h2>
        <p className="text-muted-foreground text-center mb-4">
          Please complete KYC verification to access this feature.
        </p>
        <button
          onClick={() => router.push('/dashboard/profile')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Complete KYC
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
