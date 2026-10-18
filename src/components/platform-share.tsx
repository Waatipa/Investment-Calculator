import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Share2, ContactRound, FileText, Image, Download, Link2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PLATFORM_HOME_URL, SHARE_DOWNLOADS } from '@/lib/platform-share';
import { deliverShareFile, generateShareFiles, type ShareFiles } from '@/lib/share-files';

const icons = { card: ContactRound, pdf: FileText, qr: Image };
export function PlatformShare() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [files, setFiles] = useState<ShareFiles>();
  const [generationFailed, setGenerationFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setGenerationFailed(false);
    generateShareFiles().then(result => { if (active) setFiles(result); })
      .catch(() => { if (active) setGenerationFailed(true); });
    return () => { active = false; };
  }, [retry]);
  function download(item: typeof SHARE_DOWNLOADS[number]) {
    if (!files) return;
    void deliverShareFile(files[item.id], item.filename).catch(() => toast.error('Download failed. Please try again.'));
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PLATFORM_HOME_URL);
      setCopied(true); setCopyFailed(false);
      toast.success('Homepage link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link. Please copy it below.');
      setCopyFailed(true);
    }
  }
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="outline" className="platform-share-trigger"><Share2 /><span>Share</span>{open ? <ChevronUp /> : <ChevronDown />}</Button></PopoverTrigger>
    <PopoverContent align="end" sideOffset={12} className="platform-share-panel" aria-label="Share Investico">
      <h2>Share Investico</h2>
      <p>Choose a format to share the homepage.</p>
      <div className="platform-share-options">
        {SHARE_DOWNLOADS.map(item => {
          const Icon = icons[item.id];
          return <Button variant="ghost" className="platform-share-option" key={item.id} disabled={!files} onClick={() => download(item)} aria-label={`Download ${item.title}`}><Icon /><span><strong>{item.title}</strong><small>{files ? item.detail : generationFailed ? 'Could not prepare download' : 'Preparing download…'}</small></span><Download /></Button>;
        })}
        <Button variant="ghost" className="platform-share-option" onClick={copyLink}><Link2 /><span><strong>{copied ? 'Link Copied' : 'Direct Link'}</strong><small>Copy the homepage URL</small></span>{copied ? <Check /> : <Copy />}</Button>
      </div>
      {generationFailed && <Button variant="outline" className="mt-3" onClick={() => setRetry(value => value + 1)}>Retry downloads</Button>}
      {copyFailed && <input className="mt-3 w-full border border-border p-2 text-xs" readOnly value={PLATFORM_HOME_URL} aria-label="Homepage URL" onFocus={e => e.currentTarget.select()} />}
    </PopoverContent>
  </Popover>;
}
