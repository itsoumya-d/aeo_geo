import React, { useState } from 'react';
import { Asset, AssetType, AnalysisStatus } from '../types';
import { Plus, Trash2, Globe, Youtube, Linkedin, FileText, Twitter, Search, Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateUrl, normalizeUrl, isDuplicateUrl } from '../utils/validation';
import { ProgressSteps, ANALYSIS_STEPS, getStepFromStatus } from './ProgressSteps';

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
    <div className="w-full max-w-5xl mx-auto p-6">
      <div className="text-center mb-10">
        {!embedded && (
          <>
            <div className="inline-flex items-center justify-center p-2 bg-slate-800/50 rounded-full mb-4 border border-slate-700">
              <span className="text-xs font-semibold text-primary px-3 uppercase tracking-wider">Production Build v2.0</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              AI Visibility <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Audit</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
              Reverse-engineer how LLMs perceive your brand.
            </p>
          </>
        )}
      </div>

      <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        {/* Input Toggle */}
        <div className="flex gap-4 mb-6 relative z-10">
          <button
            onClick={() => setMode('SINGLE')}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${mode === 'SINGLE' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Single Entry
          </button>
          <button
            onClick={() => setMode('BATCH')}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${mode === 'BATCH' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Batch Import (CSV)
          </button>
        </div>

        {/* Input Area */}
        <div className="flex flex-col gap-4 mb-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-4">
            {mode === 'SINGLE' ? (
              <>
                <div className="flex-shrink-0">
                  <select
                    className="h-14 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full md:w-48"
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
                  <input
                    type="text"
                    className={`w-full h-14 bg-slate-900 border text-white rounded-xl pl-5 pr-12 focus:ring-2 focus:ring-primary outline-none text-lg placeholder:text-slate-600 transition-colors ${inputError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                      }`}
                    placeholder={selectedType === AssetType.WEBSITE ? "e.g. cognition-labs.com" : "Paste full URL..."}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (inputError) setInputError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAsset()}
                  />
                </div>
                <button
                  onClick={handleAddAsset}
                  className="h-14 px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" /> Add
                </button>
              </>
            ) : (
              <div className="w-full">
                <textarea
                  className="w-full h-32 bg-slate-900 border border-slate-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
                  placeholder="Paste URLs, one per line..."
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleBatchImport}
                    className="h-10 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Import Assets
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {inputError && (
            <div className="flex items-center gap-2 text-rose-400 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4" />
              <span>{inputError}</span>
            </div>
          )}
        </div>
        {assets.length > 0 && (
          <div className="mb-8 space-y-3 relative z-10 max-h-60 overflow-y-auto pr-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-surface py-2">
              <span>Analysis Queue ({assets.length})</span>
              {isAnalyzing && <span className="text-secondary animate-pulse">Processing...</span>}
            </div>
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-800 group hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${asset.type === AssetType.YOUTUBE ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                    {getIcon(asset.type)}
                  </div>
                  <div>
                    <div className="text-base font-medium text-white">{asset.url}</div>
                    <div className="text-xs text-slate-500">{asset.type} • {asset.status}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => removeAsset(asset.id)} disabled={isAnalyzing} className="text-slate-600 hover:text-rose-500 transition-colors disabled:opacity-30">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col items-center justify-center pt-6 border-t border-slate-700 relative z-10">

          {/* Progress Steps during Analysis */}
          {isAnalyzing && (
            <div className="w-full max-w-2xl mb-6 animate-in fade-in duration-500">
              <ProgressSteps
                steps={ANALYSIS_STEPS}
                currentStep={getStepFromStatus(statusMessage || '')}
                className="mb-4"
              />
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-medium text-white">{statusMessage || "Initializing..."}</span>
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

          <button
            onClick={() => onStartAnalysis(assets)}
            disabled={assets.length === 0 || isAnalyzing}
            className={`
              h-16 px-12 rounded-xl font-bold text-xl flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95
              ${assets.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary via-indigo-500 to-purple-600 hover:shadow-2xl hover:shadow-primary/30 text-white'
              }
              ${isAnalyzing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
            `}
          >
            {isAnalyzing ? (
              <>Running AI Audit...</>
            ) : (
              <>
                <Search className="w-6 h-6" /> Start Deep Analysis
              </>
            )}
          </button>

          {!isAnalyzing && (
            <p className="mt-4 text-xs text-slate-500">
              Uses 3.5 Sonnet & Gemini Pro equivalent logic • Deep Crawl Simulation • ~30s Runtime
            </p>
          )}
        </div>
      </div>
    </div >
  );
};

