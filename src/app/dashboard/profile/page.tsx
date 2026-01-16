'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KycStatusBadge } from '@/components/ui/status-badge';
import { KYCForm } from '@/components/kyc/kyc-form';
import {
  Loader2,
  User,
  Wallet,
  Mail,
  ShieldCheck,
  Copy,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function ProfilePage() {
  const { user, userType, walletAddress, custodialPubKey, kycStatus, isLoading } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [showKycForm, setShowKycForm] = React.useState(false);

  // Display address: use walletAddress for suppliers/investors, custodialPubKey for buyers
  const displayAddress = walletAddress || custodialPubKey;
  const isCustodialWallet = !walletAddress && !!custodialPubKey;

  const copyAddress = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const needsKyc = !kycStatus || kycStatus === 'REJECTED';

  return (
    <div className="p-8 space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account and verification status</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email</span>
            </div>
            <span className="font-medium">{user?.email || 'Not set'}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Name</span>
            </div>
            <span className="font-medium">{user?.name || 'Not set'}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Account Type</span>
            </div>
            <span className="font-medium">{userType || 'Member'}</span>
          </div>

          {displayAddress && (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Wallet Address</span>
                {isCustodialWallet && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Custodial
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {displayAddress.slice(0, 8)}...{displayAddress.slice(-4)}
                </span>
                <Button variant="ghost" size="icon" onClick={copyAddress}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${displayAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                KYC Verification
              </CardTitle>
              <CardDescription>
                Complete verification to access investment features
              </CardDescription>
            </div>
            <KycStatusBadge status={kycStatus || 'NOT_SUBMITTED'} />
          </div>
        </CardHeader>
        <CardContent>
          {kycStatus === 'APPROVED' ? (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold">Verification Complete</h3>
                <p className="text-sm text-muted-foreground">
                  You have full access to all platform features.
                </p>
              </div>
            </div>
          ) : kycStatus === 'PENDING' ? (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold">Verification Pending</h3>
                <p className="text-sm text-muted-foreground">
                  Your KYC submission is being reviewed. This usually takes 1-2 business days.
                </p>
              </div>
            </div>
          ) : showKycForm ? (
            <KYCForm onSuccess={() => setShowKycForm(false)} />
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {kycStatus === 'REJECTED'
                  ? 'Your previous KYC submission was rejected. Please resubmit with correct information.'
                  : 'Complete KYC verification to invest in invoices and access all platform features.'}
              </p>
              <Button onClick={() => setShowKycForm(true)}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {kycStatus === 'REJECTED' ? 'Resubmit KYC' : 'Start Verification'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Info for Buyers */}
      {userType === 'BUYER' && isCustodialWallet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Custodial Wallet Info
            </CardTitle>
            <CardDescription>
              Your secure wallet for receiving and approving invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm">
                Your custodial wallet address is shown above. Share this address with
                suppliers so they can create invoices for you. All transactions
                (approvals, settlements) are processed securely through our
                meta-transaction system - no manual wallet management needed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick share:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAddress}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Wallet Address
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
