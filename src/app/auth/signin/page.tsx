'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFreighterWallet } from '@/hooks/useFreighterWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, Mail, Building2, TrendingUp, ShoppingCart, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { EtheralShadow } from '@/components/ui/etheral-shadow';
import { cn } from '@/lib/utils';

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

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
    hover: {
      scale: 1.02,
      y: -4,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    }
  };

  // Role Selection Step
  if (step === 'role') {
    return (
      <motion.div
        className="w-full max-w-lg space-y-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-white to-white/80 flex items-center justify-center shadow-lg shadow-white/10 mb-6"
          >
            <span className="text-2xl font-bold text-black">S</span>
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="text-lg text-white/60">
            Choose your portal to continue
          </p>
        </div>

        <div className="grid gap-4">
          {/* Supplier Card */}
          <motion.div variants={cardVariants} whileHover="hover" whileTap={{ scale: 0.98 }}>
            <Card
              className="cursor-pointer border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors group overflow-hidden relative"
              onClick={() => handleRoleSelect('SUPPLIER')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="flex items-center gap-5 p-6 relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white group-hover:text-rose-400 transition-colors">Supplier</h3>
                  <p className="text-sm text-white/50">
                    Access liquidity & manage invoices
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/20">
                  Wallet
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Buyer Card */}
          <motion.div variants={cardVariants} whileHover="hover" whileTap={{ scale: 0.98 }}>
            <Card
              className="cursor-pointer border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors group overflow-hidden relative"
              onClick={() => handleRoleSelect('BUYER')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="flex items-center gap-5 p-6 relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">Buyer</h3>
                  <p className="text-sm text-white/50">
                    Approve Payables & settlements
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                  Email
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Investor Card */}
          <motion.div variants={cardVariants} whileHover="hover" whileTap={{ scale: 0.98 }}>
            <Card
              className="cursor-pointer border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors group overflow-hidden relative"
              onClick={() => handleRoleSelect('INVESTOR')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="flex items-center gap-5 p-6 relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">Investor</h3>
                  <p className="text-sm text-white/50">
                    View opportunities & portfolio
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/20">
                  Wallet
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-white/40"
        >
          New to Sangini?{' '}
          {/* Note: In a real app we might redirect to a register flow, but for now we follow the user instruction that register/signin are the same flow initially */}
          <button onClick={() => setStep('role')} className="text-white hover:text-rose-400 hover:underline transition-colors">
            Create an account
          </button>
        </motion.p>
      </motion.div>
    );
  }

  // Login Step
  return (
    <motion.div
      className="w-full max-w-md space-y-8 relative z-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div>
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 text-white/60 hover:text-white hover:bg-white/10 -ml-2 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to roles
        </Button>
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
            style={{
              background: selectedRole === 'SUPPLIER' ? 'linear-gradient(135deg, #f43f5e, #f97316)' :
                selectedRole === 'BUYER' ? 'linear-gradient(135deg, #10b981, #14b8a6)' :
                  'linear-gradient(135deg, #3b82f6, #6366f1)'
            }}
          >
            {selectedRole === 'SUPPLIER' && <Building2 className="h-8 w-8 text-white" />}
            {selectedRole === 'BUYER' && <ShoppingCart className="h-8 w-8 text-white" />}
            {selectedRole === 'INVESTOR' && <TrendingUp className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {selectedRole === 'SUPPLIER' ? 'Supplier Portal' : selectedRole === 'BUYER' ? 'Buyer Portal' : 'Investor Portal'}
          </h1>
          <p className="text-white/50">
            {selectedRole === 'BUYER'
              ? 'Enter your credentials to access your dashboard'
              : 'Connect your secure Freighter wallet to continue'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{authError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buyer - Email Login */}
      {selectedRole === 'BUYER' && (
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-12 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 text-base font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Sign In
                <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Supplier/Investor - Wallet Login */}
      {(selectedRole === 'SUPPLIER' || selectedRole === 'INVESTOR') && (
        <div className="space-y-6">
          <Button
            onClick={handleWalletSignIn}
            disabled={isLoading || !isInstalled}
            className={cn(
              "w-full h-14 rounded-xl text-base font-semibold shadow-lg transition-all hover:scale-[1.02]",
              selectedRole === 'SUPPLIER'
                ? "bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/20"
                : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/20"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting Wallet...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                {isInstalled ? 'Connect Freighter' : 'Install Freighter Wallet'}
              </>
            )}
          </Button>

          {!isInstalled && (
            <p className="text-sm text-center text-white/40">
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-rose-400 hover:underline transition-colors"
              >
                Download Freighter Extension →
              </a>
            </p>
          )}

          <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-sm backdrop-blur-sm">
            <p className="font-medium mb-3 text-white flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Secure Authentication
            </p>
            <ol className="relative space-y-4 border-l border-white/10 ml-2">
              <li className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-white/20" />
                <span className="text-white/60">Unlock your Freighter wallet extension</span>
              </li>
              <li className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-white/20" />
                <span className="text-white/60">Approve the connection request</span>
              </li>
              <li className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-white/20" />
                <span className="text-white/60">Sign the unique nonce message</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background with Etheral Shadow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <EtheralShadow
          color="rgba(100, 100, 120, 1)"
          animation={{ scale: 80, speed: 40 }}
          noise={{ opacity: 0.3, scale: 1.2 }}
          sizing="fill"
        />
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      <Suspense fallback={
        <div className="relative z-10 flex items-center gap-2 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading secure portal...</span>
        </div>
      }>
        <SignInContent />
      </Suspense>
    </div>
  );
}
