import React, { useMemo, useState } from 'react';
import { Asset, AssetType, AnalysisStatus } from '../types';
import { Plus, Trash2, Globe, Youtube, Linkedin, FileText, Twitter, Search, Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateUrl, normalizeUrl, isDuplicateUrl } from '../utils/validation';
import { useToast } from './Toast';
import { ProgressSteps, ANALYSIS_STEPS, getStepFromStatus } from './ProgressSteps';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface InputLayerProps {
  onStartAnalysis: (assets: Asset[]) => void;
  isAnalyzing: boolean;
  statusMessage?: string;
  discoveredCount?: number;
  embedded?: boolean;
}

export const InputLayer: React.FC<InputLayerProps> = ({ onStartAnalysis, isAnalyzing, statusMessage, discoveredCount, embedded = false }) => {
  const { t } = useTranslation();
  const { organization } = useAuth();
  const toast = useToast();
  const creditsRemaining = organization?.audit_credits_remaining ?? null;
  const isOutOfCredits = creditsRemaining !== null && creditsRemaining <= 0;
  const isLowCredits = creditsRemaining !== null && creditsRemaining > 0 && creditsRemaining <= 3;

  const [inputValue, setInputValue] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [selectedType, setSelectedType] = useState<AssetType>(AssetType.WEBSITE);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inputError, setInputError] = useState<string>('');

  const primaryWebsite = assets.find(asset => asset.type === AssetType.WEBSITE);
  const supportAssetCount = assets.filter(asset => asset.type !== AssetType.WEBSITE).length;
  const canStartAnalysis = assets.length > 0 && !isAnalyzing && !isOutOfCredits && Boolean(primaryWebsite);

  const suggestedSurfaces = useMemo(() => {
    if (!primaryWebsite) return [];

    try {
      const websiteUrl = new URL(primaryWebsite.url);
      const hostname = websiteUrl.hostname.replace(/^www\./, '');
      const origin = websiteUrl.origin;

      return [
        { type: AssetType.DOCS, label: 'Docs', url: `${origin}/docs` },
        { type: AssetType.BLOG, label: 'Blog', url: `${origin}/blog` },
        { type: AssetType.OTHER, label: 'Help Center', url: `${origin}/help` },
        { type: AssetType.OTHER, label: 'Pricing', url: `${origin}/pricing` },
        { type: AssetType.OTHER, label: 'About', url: `${origin}/about` },
        { type: AssetType.DOCS, label: 'Docs Subdomain', url: `https://docs.${hostname}` },
      ]
        .filter((suggestion, index, list) =>
          list.findIndex(item => item.url === suggestion.url) === index &&
          !isDuplicateUrl(suggestion.url, assets.map(asset => asset.url))
        )
        .slice(0, 5);
    } catch {
      return [];
    }
  }, [assets, primaryWebsite]);

  const handleAddAsset = () => {
    if (!inputValue.trim()) {
      setInputError('Please enter a URL');
      return;
    }

    const validation = validateUrl(inputValue);
    if (!validation.isValid) {
      setInputError(validation.error || 'Invalid URL');
      return;
    }

    const url = normalizeUrl(inputValue);
    const existingUrls = assets.map(a => a.url);
    if (isDuplicateUrl(url, existingUrls)) {
      setInputError('This URL has already been added');
      return;
    }

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      type: selectedType,
      url,
      status: AnalysisStatus.IDLE
    };

    setAssets([...assets, newAsset]);
    setInputValue('');
    setInputError('');
  };

  const handleBatchImport = () => {
    if (!batchInput.trim()) return;

    const lines = batchInput.split('\n').filter(l => l.trim().length > 0);
    const existingUrls = assets.map(a => a.url);
    const newAssets: Asset[] = [];
    let skipped = 0;

    for (const line of lines) {
      const raw = line.trim();
      const validation = validateUrl(raw);
      if (!validation.isValid) {
        skipped++;
        continue;
      }

      const normalized = normalizeUrl(raw);
      if (isDuplicateUrl(normalized, [...existingUrls, ...newAssets.map(a => a.url)])) {
        skipped++;
        continue;
      }

      newAssets.push({
        id: crypto.randomUUID(),
        type: AssetType.OTHER,
        url: normalized,
        status: AnalysisStatus.IDLE
      });
    }

    if (newAssets.length > 0) {
      setAssets([...assets, ...newAssets]);
    }

    if (skipped > 0) {
      toast.warning('Some URLs skipped', `Added ${newAssets.length} URL${newAssets.length !== 1 ? 's' : ''}, skipped ${skipped} invalid or duplicate.`);
    }

    setBatchInput('');
    setMode('SINGLE');
  };

  const handleAddSuggestedAsset = (type: AssetType, url: string) => {
    const validation = validateUrl(url);
    if (!validation.isValid) {
      toast.error('Suggestion unavailable', 'That suggested URL does not look valid.');
      return;
    }

    const normalized = normalizeUrl(url);
    if (isDuplicateUrl(normalized, assets.map(asset => asset.url))) {
      return;
    }

    setAssets([
      ...assets,
      {
        id: crypto.randomUUID(),
        type,
        url: normalized,
        status: AnalysisStatus.IDLE
      }
    ]);
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const getIcon = (type: AssetType) => {
    switch (type) {
      case AssetType.WEBSITE: return <Globe className="w-4 h-4" />;
      case AssetType.YOUTUBE: return <Youtube className="w-4 h-4" />;
      case AssetType.LINKEDIN: return <Linkedin className="w-4 h-4" />;
      case AssetType.DOCS: return <FileText className="w-4 h-4" />;
      case AssetType.TWITTER: return <Twitter className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className={`w-full max-w-5xl mx-auto ${embedded ? 'p-0' : 'p-4 sm:p-6'}`}>
      <Card variant="glass" className="relative overflow-hidden p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex gap-2">
            <Button
              variant={mode === 'SINGLE' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('SINGLE')}
            >
              Single Entry
            </Button>
            <Button
              variant={mode === 'BATCH' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('BATCH')}
            >
              Add Multiple URLs
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8 relative z-10">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Primary Domain</p>
              <p className="mt-2 text-lg font-display font-bold text-white">
                {primaryWebsite ? 'Connected' : 'Required'}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {primaryWebsite ? primaryWebsite.url : 'Add your main website first so the crawler has a canonical brand source.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Brand Surfaces</p>
              <p className="mt-2 text-lg font-display font-bold text-white">{supportAssetCount}</p>
              <p className="mt-1 text-sm text-text-secondary">
                Add docs, blog, help center, and social surfaces to improve entity coverage.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Audit Readiness</p>
              <p className="mt-2 text-lg font-display font-bold text-white">
                {canStartAnalysis ? 'Ready to run' : 'Needs setup'}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {isOutOfCredits
                  ? 'Credits are depleted right now.'
                  : primaryWebsite
                    ? 'You can launch now, or add more surfaces for better answer-engine coverage.'
                    : 'A website asset is required before you can start the audit.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {mode === 'SINGLE' ? (
              <>
                <div className="flex-shrink-0 w-full md:w-48">
                  <label htmlFor="asset-type" className="sr-only">Asset Type</label>
                  <select
                    id="asset-type"
                    aria-label="Select asset type"
                    className="h-10 w-full bg-background border border-border text-text-primary rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer text-sm"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as AssetType)}
                  >
                    <option value={AssetType.WEBSITE}>Website Root</option>
                    <option value={AssetType.DOCS}>Docs / Help</option>
                    <option value={AssetType.BLOG}>Blog Domain</option>
                    <option value={AssetType.YOUTUBE}>YouTube</option>
                    <option value={AssetType.LINKEDIN}>LinkedIn</option>
                    <option value={AssetType.TWITTER}>Twitter / X</option>
                    <option value={AssetType.OTHER}>Other URL</option>
                  </select>
                </div>
                <div className="flex-grow relative">
                  <Input
                    className="h-10 text-base"
                    placeholder={selectedType === AssetType.WEBSITE ? 'e.g. cognition-labs.com' : 'Paste full URL...'}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (inputError) setInputError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAsset()}
                    error={inputError}
                  />
                </div>
                <Button
                  onClick={handleAddAsset}
                  className="h-10 px-6 font-bold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" /> Add
                </Button>
              </>
            ) : (
              <div className="w-full">
                <label htmlFor="batch-urls" className="sr-only">Paste URLs for batch import</label>
                <textarea
                  id="batch-urls"
                  aria-label="Paste URLs, one per line"
                  className="w-full h-32 bg-background border border-border text-text-primary rounded-lg p-4 focus:ring-2 focus:ring-primary outline-none font-mono text-sm resize-none"
                  placeholder="Paste URLs, one per line..."
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleBatchImport} size="sm">
                    Import Assets
                  </Button>
                </div>
              </div>
            )}
          </div>

          {suggestedSurfaces.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Suggested Brand Surfaces</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    One-click additions to make the audit more representative of how answer engines see your brand.
                  </p>
                </div>
                <Badge variant="default" className="w-fit">
                  {suggestedSurfaces.length} suggestions
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestedSurfaces.map((surface) => (
                  <button
                    key={surface.url}
                    type="button"
                    onClick={() => handleAddSuggestedAsset(surface.type, surface.url)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>{surface.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {assets.length > 0 && (
          <div className="mb-8 space-y-3 relative z-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 sticky top-0 bg-surface/90 backdrop-blur-sm py-2 z-20">
              <span>Analysis Queue ({assets.length})</span>
              {isAnalyzing && <span className="text-secondary animate-pulse">Processing...</span>}
            </div>
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${asset.type === AssetType.YOUTUBE ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                    {getIcon(asset.type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{asset.url}</div>
                    <div className="text-xs text-text-muted">{asset.type} • {asset.status}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeAsset(asset.id)}
                    disabled={isAnalyzing}
                    aria-label={`Remove ${asset.url} from queue`}
                    className="text-text-muted hover:text-red-500 transition-colors disabled:opacity-30 p-1"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col items-center justify-center pt-6 border-t border-border relative z-10">
          {isAnalyzing && (
            <div className="w-full max-w-2xl mb-6 animate-in fade-in duration-500" aria-live="polite" aria-atomic="true">
              <ProgressSteps
                steps={ANALYSIS_STEPS}
                currentStep={getStepFromStatus(statusMessage || '')}
                className="mb-4"
              />
              <div className="bg-background/80 rounded-lg p-4 border border-border" role="status">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
                  <span className="text-sm font-medium text-text-primary">{statusMessage || 'Initializing...'}</span>
                </div>
                {discoveredCount !== undefined && discoveredCount > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-secondary">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    <span>Discovered {discoveredCount} pages in site structure map</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {creditsRemaining !== null && !isAnalyzing && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-1.5 text-xs font-medium mb-3 ${
                isOutOfCredits ? 'text-rose-400' : isLowCredits ? 'text-amber-400' : 'text-text-muted'
              }`}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              {isOutOfCredits
                ? t('audit.no_credits', 'No credits remaining - top up to run audits')
                : `${creditsRemaining} ${t(creditsRemaining === 1 ? 'audit.credits_label' : 'audit.credits_label_plural', creditsRemaining === 1 ? 'audit credit' : 'audit credits')} ${t('audit.credits_remaining', 'remaining • 1 credit per audit')}`
              }
            </div>
          )}

          {!primaryWebsite && !isAnalyzing && (
            <div className="mb-3 text-center text-sm text-amber-400">
              Add your main website before starting the audit.
            </div>
          )}

          {(primaryWebsite || isAnalyzing || isOutOfCredits) && (
            <Button
              onClick={() => onStartAnalysis(assets)}
              disabled={!canStartAnalysis}
              size="lg"
              className={`
                w-full sm:w-auto h-14 px-12 text-lg font-bold flex items-center gap-3
                ${isAnalyzing ? 'opacity-70' : isOutOfCredits ? 'opacity-60 cursor-not-allowed' : 'bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:shadow-glow'}
              `}
            >
              {isAnalyzing ? (
                <>{t('audit.running', 'Running AI Audit...')}</>
              ) : isOutOfCredits ? (
                <>
                  <AlertCircle className="w-5 h-5" aria-hidden="true" /> {t('audit.top_up', 'Top Up to Continue')}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" aria-hidden="true" /> {t('audit.start', 'Start AEO Audit')}
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
