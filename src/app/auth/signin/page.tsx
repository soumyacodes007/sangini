'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFreighterWallet } from '@/hooks/useFreighterWallet';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(error);

  const { isInstalled, connect, publicKey } = useFreighterWallet();

  // Email/Password Sign In
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

  // Wallet Sign In
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
        // Get the address after connecting
        walletAddress = publicKey;
      }

      if (!walletAddress) {
        setAuthError('Could not get wallet address');
        setIsLoading(false);
        return;
      }

      // Get nonce from server
      const nonceRes = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
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

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Sign In to Sangini</h1>
        <p className="mt-2 text-muted-foreground">
          Invoice financing on Stellar
        </p>
      </div>

      {authError && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
          {authError}
        </div>
      )}

      {/* Wallet Sign In */}
      <div className="space-y-4">
        <button
          onClick={handleWalletSignIn}
          disabled={isLoading || !isInstalled}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          </svg>
          {isInstalled ? 'Sign in with Freighter Wallet' : 'Install Freighter Wallet'}
        </button>

        {!isInstalled && (
          <p className="text-sm text-center text-muted-foreground">
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Get Freighter →
            </a>
          </p>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Email Sign In */}
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Email'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
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
