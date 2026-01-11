'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ExternalLink, Copy } from 'lucide-react';

type TransactionStatus = 'signing' | 'submitting' | 'confirming' | 'success' | 'error';

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: TransactionStatus;
  title?: string;
  txHash?: string;
  error?: string;
  onRetry?: () => void;
}

const statusConfig: Record<TransactionStatus, {
  title: string;
  description: string;
  icon: React.ReactNode;
}> = {
  signing: {
    title: 'Waiting for Signature',
    description: 'Please sign the transaction in your Freighter wallet.',
    icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
  },
  submitting: {
    title: 'Submitting Transaction',
    description: 'Your transaction is being submitted to the network.',
    icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
  },
  confirming: {
    title: 'Confirming',
    description: 'Waiting for transaction confirmation...',
    icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
  },
  success: {
    title: 'Transaction Successful',
    description: 'Your transaction has been confirmed on the network.',
    icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
  },
  error: {
    title: 'Transaction Failed',
    description: 'Something went wrong with your transaction.',
    icon: <XCircle className="h-12 w-12 text-red-500" />,
  },
};

export function TransactionModal({
  open,
  onOpenChange,
  status,
  title,
  txHash,
  error,
  onRetry,
}: TransactionModalProps) {
  const [copied, setCopied] = React.useState(false);
  const config = statusConfig[status];

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const explorerUrl = txHash 
    ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>
          <DialogTitle>{title || config.title}</DialogTitle>
          <DialogDescription>
            {error || config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {txHash && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono flex-1 truncate">
                  {txHash}
                </code>
                <Button variant="ghost" size="icon" onClick={copyTxHash}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {status === 'error' && onRetry && (
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
            )}
            
            {status === 'success' && explorerUrl && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                  View on Explorer
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}

            {(status === 'success' || status === 'error') && (
              <Button 
                variant={status === 'success' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {status === 'success' ? 'Done' : 'Close'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing transaction modal state
export function useTransactionModal() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<TransactionStatus>('signing');
  const [txHash, setTxHash] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | undefined>();

  const startTransaction = () => {
    setOpen(true);
    setStatus('signing');
    setTxHash(undefined);
    setError(undefined);
  };

  const setSubmitting = () => setStatus('submitting');
  const setConfirming = () => setStatus('confirming');
  
  const setSuccess = (hash?: string) => {
    setStatus('success');
    setTxHash(hash);
  };

  const setFailed = (errorMessage: string) => {
    setStatus('error');
    setError(errorMessage);
  };

  const close = () => setOpen(false);

  return {
    open,
    status,
    txHash,
    error,
    setOpen,
    startTransaction,
    setSubmitting,
    setConfirming,
    setSuccess,
    setFailed,
    close,
  };
}
