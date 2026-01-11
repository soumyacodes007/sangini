'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface KYCGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function KYCGate({ children, fallback }: KYCGateProps) {
  const { isKycApproved, kycStatus, isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return null;
  }

  if (isKycApproved) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">KYC Verification Required</h3>
          <p className="text-sm text-muted-foreground">
            {kycStatus === 'PENDING' 
              ? 'Your KYC verification is pending review.'
              : kycStatus === 'REJECTED'
              ? 'Your KYC verification was rejected. Please resubmit.'
              : 'Complete KYC verification to access this feature.'}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/profile')}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          {kycStatus === 'PENDING' ? 'View Status' : 'Complete KYC'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Wrapper for investment actions
export function KYCProtectedAction({ 
  children, 
  onAction 
}: { 
  children: React.ReactNode;
  onAction: () => void;
}) {
  const { isKycApproved } = useAuth();
  const router = useRouter();

  const handleClick = () => {
    if (isKycApproved) {
      onAction();
    } else {
      router.push('/dashboard/profile');
    }
  };

  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
}
