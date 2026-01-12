'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFreighterWallet } from '@/hooks/useFreighterWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, Mail, Building2, TrendingUp, ShoppingCart, ArrowLeft } from 'lucide-react';

type UserRole = 'SUPPLIER' | 'BUYER' | 'INVESTOR' | null;

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  // Step state: 'role' -> 'login'
  const [step, setStep] = useState<'role' | 'login'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(error);

  const { isInstalled, connect, publicKey } = useFreighterWallet();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('login');
    setAuthError(null);
  };

  const handleBack = () => {
    setStep('role');
    setSelectedRole(null);
    setAuthError(null);
  };

  // Email/Password Sign In (for Buyers)
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setAuthError(result.error);
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  // Wallet Sign In (for Suppliers/Investors)
  const handleWalletSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Connect wallet if not connected
      let walletAddress = publicKey;
      if (!walletAddress) {
        const connected = await connect();
        if (!connected) {
          setAuthError('Failed to connect wallet');
          setIsLoading(false);
          return;
        }
        // Wait a bit for the wallet to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the address from Freighter directly
        const { getAddress } = await import('@stellar/freighter-api');
        const addressResult = await getAddress();
        if (addressResult.error || !addressResult.address) {
          setAuthError('Could not get wallet address');
          setIsLoading(false);
          return;
        }
        walletAddress = addressResult.address;
      }

      if (!walletAddress) {
        setAuthError('Could not get wallet address');
        setIsLoading(false);
        return;
      }

      // Get nonce from server with the selected role
      const nonceRes = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress,
          userType: selectedRole // Pass the selected role
        }),
      });

      if (!nonceRes.ok) {
        const data = await nonceRes.json();
        throw new Error(data.error || 'Failed to get nonce');
      }

      const { nonce, message } = await nonceRes.json();

      // Sign message with Freighter
      const { signMessage } = await import('@stellar/freighter-api');
      const signResult = await signMessage(message, {
        networkPassphrase: 'Test SDF Network ; September 2015',
        address: walletAddress,
      });

      if (signResult.error) {
        throw new Error(signResult.error);
      }

      // Authenticate with signed message
      const result = await signIn('wallet', {
        walletAddress,
        signature: signResult.signedMessage,
        nonce,
        userType: selectedRole, // Pass the selected role
        redirect: false,
      });

      if (result?.error) {
        setAuthError(result.error);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Wallet sign in failed');
    }

    setIsLoading(false);
  };

  // Role Selection Step
  if (step === 'role') {
    return (
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to Sangini</h1>
          <p className="mt-2 text-muted-foreground">
            Select your role to continue
          </p>
        </div>

        <div className="grid gap-4">
          {/* Supplier Card */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleRoleSelect('SUPPLIER')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Supplier</h3>
                <p className="text-sm text-muted-foreground">
                  Create and tokenize invoices for financing
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Wallet Login
              </div>
            </CardContent>
          </Card>

          {/* Buyer Card */}
          <Card 
            className="cursor-pointer hover:border-emerald-500 transition-colors"
            onClick={() => handleRoleSelect('BUYER')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Buyer</h3>
                <p className="text-sm text-muted-foreground">
                  Approve invoices and settle payments
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Email Login
              </div>
            </CardContent>
          </Card>

          {/* Investor Card */}
          <Card 
            className="cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => handleRoleSelect('INVESTOR')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Investor</h3>
                <p className="text-sm text-muted-foreground">
                  Invest in verified invoices and earn yield
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Wallet Login
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    );
  }

  // Login Step
  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Sign In as {selectedRole === 'SUPPLIER' ? 'Supplier' : selectedRole === 'BUYER' ? 'Buyer' : 'Investor'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {selectedRole === 'BUYER' 
              ? 'Sign in with your email and password'
              : 'Connect your Freighter wallet to continue'}
          </p>
        </div>
      </div>

      {authError && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
          {authError}
        </div>
      )}

      {/* Buyer - Email Login */}
      {selectedRole === 'BUYER' && (
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Sign in with Email
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Register as Buyer
            </Link>
          </p>
        </form>
      )}

      {/* Supplier/Investor - Wallet Login */}
      {(selectedRole === 'SUPPLIER' || selectedRole === 'INVESTOR') && (
        <div className="space-y-4">
          <Button
            onClick={handleWalletSignIn}
            disabled={isLoading || !isInstalled}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                {isInstalled ? 'Connect Freighter Wallet' : 'Install Freighter Wallet'}
              </>
            )}
          </Button>

          {!isInstalled && (
            <p className="text-sm text-center text-muted-foreground">
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get Freighter Wallet →
              </a>
            </p>
          )}

          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-2">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click &quot;Connect Freighter Wallet&quot;</li>
              <li>Approve the connection in Freighter</li>
              <li>Sign the authentication message</li>
              <li>You&apos;re logged in!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
