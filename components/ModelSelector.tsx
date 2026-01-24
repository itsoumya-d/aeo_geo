import React from 'react';
import { Card } from './ui/Card';

export type LLMProvider = 'gemini' | 'claude' | 'openai';

interface ModelSelectorProps {
    value: LLMProvider;
    onChange: (provider: LLMProvider) => void;
    disabled?: boolean;
    compact?: boolean;
}

const MODELS: { id: LLMProvider; name: string; description: string; icon: string }[] = [
    {
        id: 'gemini',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, intelligent responses',
        icon: '✨'
    },
    {
        id: 'claude',
        name: 'Claude 3.5 Sonnet',
        description: 'Nuanced reasoning',
        icon: '🧠'
    },
    {
        id: 'openai',
        name: 'GPT-4o',
        description: 'OpenAI flagship model',
        icon: '🤖'
    }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    value,
    onChange,
    disabled = false,
    compact = false
}) => {
    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <label htmlFor="model-select" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    AI Model
                </label>
                <select
                    id="model-select"
                    value={value}
                    onChange={(e) => onChange(e.target.value as LLMProvider)}
                    disabled={disabled}
                    className="h-8 bg-background border border-border text-text-primary rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer disabled:opacity-50"
                    aria-label="Select AI model"
                >
                    {MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.icon} {model.name}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Select AI Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MODELS.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => onChange(model.id)}
                        disabled={disabled}
                        className={`
                            p-4 rounded-xl border-2 transition-all text-left
                            ${value === model.id
                                ? 'border-primary bg-primary/10 shadow-glow'
                                : 'border-border bg-surface/50 hover:border-primary/50'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        aria-pressed={value === model.id}
                        role="radio"
                        aria-checked={value === model.id}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl" aria-hidden="true">{model.icon}</span>
                            <span className="font-bold text-text-primary">{model.name}</span>
                        </div>
                        <p className="text-xs text-text-muted">{model.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ModelSelector;
