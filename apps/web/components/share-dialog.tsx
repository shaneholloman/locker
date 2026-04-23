'use client';

import { useState } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function ShareDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { id: string; name: string; type: 'file' | 'folder' };
}) {
  const [access, setAccess] = useState<'download' | 'raw'>('download');
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isFolder = target.type === 'folder';
  const effectiveAccess = isFolder ? 'download' : access;

  const createShare = trpc.shares.create.useMutation({
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      toast.success('Share link created');
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleCreate = () => {
    createShare.mutate({
      ...(target.type === 'file'
        ? { fileId: target.id }
        : { folderId: target.id }),
      access: effectiveAccess,
      password: password || undefined,
    });
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setShareUrl(null);
      setPassword('');
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share {target.type}</DialogTitle>
          <DialogDescription>
            Create a shareable link for &ldquo;{target.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="text-xs font-mono" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="text-green-500" />
                ) : (
                  <Copy />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {effectiveAccess === 'raw'
                ? 'This URL serves the raw file — use it directly in <img>, <video>, etc.'
                : `Anyone with this link can download this ${target.type}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {!isFolder && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Link type
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={access === 'download' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAccess('download')}
                  >
                    Download
                  </Button>
                  <Button
                    variant={access === 'raw' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAccess('raw')}
                  >
                    Raw file
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {access === 'raw'
                    ? 'Proxies the file directly — embeddable in <img> tags.'
                    : 'Shows a download page with file info.'}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Password (optional)
              </label>
              <Input
                type="password"
                placeholder="Set a password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!shareUrl && (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createShare.isPending}
              >
                <Link />
                Create link
              </Button>
            </>
          )}
          {shareUrl && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
