'use client';

import * as React from 'react';
import { ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DocumentViewerProps {
  cid: string;
  fileName?: string;
}

export function DocumentViewer({ cid, fileName }: DocumentViewerProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  if (!cid) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No document attached</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{fileName || 'Document'}</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={gatewayUrl} target="_blank" rel="noopener noreferrer">
              Open in New Tab
              <ExternalLink className="h-3 w-3 ml-2" />
            </a>
          </Button>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-muted min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load preview</p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <a href={gatewayUrl} target="_blank" rel="noopener noreferrer">
                  Open directly
                </a>
              </Button>
            </div>
          )}

          {isPdf ? (
            <iframe
              src={gatewayUrl}
              className="w-full h-[500px]"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          ) : isImage ? (
            <img
              src={gatewayUrl}
              alt={fileName || 'Document'}
              className="w-full h-auto max-h-[500px] object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Preview not available</p>
              <Button asChild>
                <a href={gatewayUrl} target="_blank" rel="noopener noreferrer">
                  Download File
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground font-mono break-all">
          IPFS CID: {cid}
        </p>
      </CardContent>
    </Card>
  );
}
