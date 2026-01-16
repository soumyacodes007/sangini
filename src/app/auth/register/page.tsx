'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFreighterWallet } from '@/hooks/useFreighterWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, Building2, TrendingUp, ShoppingCart, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type UserRole = 'SUPPLIER' | 'BUYER' | 'INVESTOR' | null;

function RegisterContent() {
  const router = useRouter();

  // Step state: 'role' -> 'register'
  const [step, setStep] = useState<'role' | 'register'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { isInstalled, connect, publicKey } = useFreighterWallet();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('register');
    setError(null);
  };

  const handleBack = () => {
    setStep('role');
    setSelectedRole(null);
    setError(null);
    setSuccess(null);
  };

  // Buyer Registration (Email/Password)
  const handleBuyerRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the terms and conditions');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          companyName,
          userType: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/auth/signin?registered=true');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }

    setIsLoading(false);
  };

  // Wallet Registration (Supplier/Investor)
  const handleWalletRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!acceptedTerms) {
      setError('Please accept the terms and conditions');
      setIsLoading(false);
      return;
    }

    try {
      // Connect wallet if not connected
      let walletAddress = publicKey;
      if (!walletAddress) {
        const connected = await connect();
        if (!connected) {
          setError('Failed to connect wallet. Please install Freighter extension.');
          setIsLoading(false);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const { getAddress } = await import('@stellar/freighter-api');
        const addressResult = await getAddress();
        if (addressResult.error || !addressResult.address) {
          setError('Could not get wallet address');
          setIsLoading(false);
          return;
        }
        walletAddress = addressResult.address;
      }

      if (!walletAddress) {
        setError('Could not get wallet address');
        setIsLoading(false);
        return;
      }

      // Register with wallet
      const res = await fetch('/api/auth/wallet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          name: fullName,
          companyName: selectedRole === 'SUPPLIER' ? companyName : undefined,
          userType: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/auth/signin');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet registration failed');
    }

    setIsLoading(false);
  };

  // Role Selection Step
  if (step === 'role') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Join Sangini
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Select your role to get started
          </p>
        </div>

        <div className="grid gap-4">
          {/* Supplier Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Card
              className="cursor-pointer border-2 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300"
              onClick={() => handleRoleSelect('SUPPLIER')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg"
                  whileHover={{ rotate: 5 }}
                >
                  <Building2 className="h-7 w-7 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Supplier</h3>
                  <p className="text-sm text-muted-foreground">
                    Tokenize invoices and get instant liquidity
                  </p>
                </div>
                <div className="text-xs text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-full font-medium">
                  Wallet
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Buyer Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Card
              className="cursor-pointer border-2 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
              onClick={() => handleRoleSelect('BUYER')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
                  whileHover={{ rotate: 5 }}
                >
                  <ShoppingCart className="h-7 w-7 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Buyer</h3>
                  <p className="text-sm text-muted-foreground">
                    Approve invoices and manage payments
                  </p>
                </div>
                <div className="text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full font-medium">
                  Email
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Investor Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Card
              className="cursor-pointer border-2 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
              onClick={() => handleRoleSelect('INVESTOR')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg"
                  whileHover={{ rotate: 5 }}
                >
                  <TrendingUp className="h-7 w-7 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Investor</h3>
                  <p className="text-sm text-muted-foreground">
                    Fund invoices and earn competitive yields
                  </p>
                </div>
                <div className="text-xs text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full font-medium">
                  Wallet
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    );
  }

  // Registration Step
  const isBuyer = selectedRole === 'BUYER';
  const isWalletRegistration = selectedRole === 'SUPPLIER' || selectedRole === 'INVESTOR';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md space-y-6"
    >
      <div>
        <Button variant="ghost" onClick={handleBack} className="mb-4 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Register as {selectedRole === 'SUPPLIER' ? 'Supplier' : selectedRole === 'BUYER' ? 'Buyer' : 'Investor'}
          </h1>
          <p className="text-muted-foreground">
            {isBuyer
              ? 'Create your account with email and password'
              : 'Connect your Freighter wallet to continue'}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-emerald-500 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {isBuyer ? (
        // Buyer Registration Form
        <form onSubmit={handleBuyerRegistration} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              className="transition-all focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name (Optional)</Label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="transition-all focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="transition-all focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="transition-all focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the{' '}
              <Link href="#" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="#" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      ) : (
        // Wallet Registration Form
        <form onSubmit={handleWalletRegistration} className="space-y-4">
          <div className="p-4 border border-dashed rounded-lg bg-muted/50">
            {publicKey ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Wallet Connected</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {publicKey.slice(0, 8)}...{publicKey.slice(-8)}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ) : (
              <Button
                type="button"
                onClick={connect}
                variant="outline"
                className="w-full"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Freighter Wallet
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              className="transition-all focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name {selectedRole === 'SUPPLIER' ? '' : '(Optional)'}
            </Label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              required={selectedRole === 'SUPPLIER'}
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the{' '}
              <Link href="#" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="#" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !publicKey || !acceptedTerms}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-background to-background" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <RegisterContent />
      </Suspense>
    </div>
  );
}
