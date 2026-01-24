import React, { useState } from 'react';
import { Asset, AssetType, AnalysisStatus } from '../types';
import { Plus, Trash2, Globe, Youtube, Linkedin, FileText, Twitter, Search, Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateUrl, normalizeUrl, isDuplicateUrl } from '../utils/validation';
import { ProgressSteps, ANALYSIS_STEPS, getStepFromStatus } from './ProgressSteps';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface InputLayerProps {
  onStartAnalysis: (assets: Asset[]) => void;
  isAnalyzing: boolean;
  statusMessage?: string;
  discoveredCount?: number;
  embedded?: boolean;
}

export const InputLayer: React.FC<InputLayerProps> = ({ onStartAnalysis, isAnalyzing, statusMessage, discoveredCount, embedded = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [selectedType, setSelectedType] = useState<AssetType>(AssetType.WEBSITE);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inputError, setInputError] = useState<string>('');

  const handleAddAsset = () => {
    if (!inputValue.trim()) {
      setInputError('Please enter a URL');
      return;
    }

    // Validate the URL
    const validation = validateUrl(inputValue);
    if (!validation.isValid) {
      setInputError(validation.error || 'Invalid URL');
      return;
    }

    const url = normalizeUrl(inputValue);

    // Check for duplicates
    const existingUrls = assets.map(a => a.url);
    if (isDuplicateUrl(url, existingUrls)) {
      setInputError('This URL has already been added');
      return;
    }

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      type: selectedType,
      url: url,
      status: AnalysisStatus.IDLE
    };

    setAssets([...assets, newAsset]);
    setInputValue('');
    setInputError('');
  };

  const handleBatchImport = () => {
    if (!batchInput.trim()) return;

    const lines = batchInput.split('\n').filter(l => l.trim().length > 0);
    const newAssets = lines.map(line => {
      let url = line.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      return {
        id: crypto.randomUUID(),
        type: AssetType.OTHER, // Default to Other for batch, or could infer
        url: url,
        status: AnalysisStatus.IDLE
      };
    });

    setAssets([...assets, ...newAssets]);
    setBatchInput('');
    setMode('SINGLE');
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
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6">
      <div className="text-center mb-10">
        {!embedded && (
          <>
            <div className="inline-flex items-center justify-center p-1.5 px-3 bg-primary/10 rounded-full mb-4 border border-primary/20">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Production Build v2.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-text-primary mb-6 tracking-tight">
              AI Visibility <span className="text-gradient">Audit</span>
            </h1>
            <p className="text-text-secondary text-lg max-w-3xl mx-auto leading-relaxed">
              Reverse-engineer how LLMs perceive your brand.
            </p>
          </>
        )}
      </div>

      <Card variant="glass" className="relative overflow-hidden p-8 shadow-2xl">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        {/* Input Toggle */}
        <div className="flex gap-2 mb-6 relative z-10">
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
            Batch Import (CSV)
          </Button>
        </div>

        {/* Input Area */}
        <div className="flex flex-col gap-4 mb-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-4">
            {mode === 'SINGLE' ? (
              <>
                <div className="flex-shrink-0 w-full md:w-48">
                  <select
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
                    placeholder={selectedType === AssetType.WEBSITE ? "e.g. cognition-labs.com" : "Paste full URL..."}
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
                <textarea
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
                  <button onClick={() => removeAsset(asset.id)} disabled={isAnalyzing} className="text-text-muted hover:text-red-500 transition-colors disabled:opacity-30 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col items-center justify-center pt-6 border-t border-border relative z-10">

          {/* Progress Steps during Analysis */}
          {isAnalyzing && (
            <div className="w-full max-w-2xl mb-6 animate-in fade-in duration-500">
              <ProgressSteps
                steps={ANALYSIS_STEPS}
                currentStep={getStepFromStatus(statusMessage || '')}
                className="mb-4"
              />
              <div className="bg-background/80 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-medium text-text-primary">{statusMessage || "Initializing..."}</span>
                </div>
                {discoveredCount !== undefined && discoveredCount > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-secondary">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Discovered {discoveredCount} pages in site structure map</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={() => onStartAnalysis(assets)}
            disabled={assets.length === 0 || isAnalyzing}
            size="lg"
            className={`
              w-full sm:w-auto h-14 px-12 text-lg font-bold flex items-center gap-3 
              ${isAnalyzing ? 'opacity-70' : 'bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:shadow-glow'}
            `}
          >
            {isAnalyzing ? (
              <>Running AI Audit...</>
            ) : (
              <>
                <Search className="w-5 h-5" /> Start Deep Analysis
              </>
            )}
          </Button>

          {!isAnalyzing && (
            <p className="mt-4 text-xs text-text-muted font-medium">
              Uses 3.5 Sonnet & Gemini Pro equivalent logic • Deep Crawl Simulation • ~30s Runtime
            </p>
          )}
        </div>
      </Card>
    </div >
  );
};
