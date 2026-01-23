import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export interface Step {
    id: string;
    label: string;
    description?: string;
}

interface ProgressStepsProps {
    steps: Step[];
    currentStep: number; // 0-indexed
    className?: string;
}

/**
 * Multi-step progress indicator with animations
 * Shows completed steps with checkmarks, current step with spinner, and pending steps dimmed
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({
    steps,
    currentStep,
    className = ''
}) => {
    return (
        <div className={`w-full max-w-2xl mx-auto ${className}`}>
            <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-700">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    />
                </div>

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const isPending = index > currentStep;

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center"
                            >
                                {/* Step Circle */}
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300 ease-out
                    ${isCompleted
                                            ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25'
                                            : isCurrent
                                                ? 'bg-slate-800 border-2 border-primary text-primary shadow-lg shadow-primary/20'
                                                : 'bg-slate-800 border-2 border-slate-700 text-slate-500'
                                        }
                  `}
                                >
                                    {isCompleted ? (
                                        <Check className="w-5 h-5 animate-in zoom-in-50 duration-300" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <span className="text-sm font-semibold">{index + 1}</span>
                                    )}
                                </div>

                                {/* Step Label */}
                                <div className="mt-3 text-center">
                                    <p
                                        className={`
                      text-sm font-medium transition-colors duration-300
                      ${isCompleted || isCurrent ? 'text-white' : 'text-slate-500'}
                    `}
                                    >
                                        {step.label}
                                    </p>
                                    {step.description && (
                                        <p
                                            className={`
                        text-xs mt-0.5 transition-colors duration-300
                        ${isCurrent ? 'text-primary' : 'text-slate-600'}
                      `}
                                        >
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/**
 * Default analysis steps for the AI Visibility Engine
 */
export const ANALYSIS_STEPS: Step[] = [
    { id: 'init', label: 'Initialize', description: 'Setting up analysis' },
    { id: 'discover', label: 'Discover', description: 'Finding pages' },
    { id: 'analyze', label: 'Analyze', description: 'AI processing' },
    { id: 'report', label: 'Generate', description: 'Creating report' },
];

/**
 * Get current step index based on status message
 */
export function getStepFromStatus(statusMessage: string): number {
    if (!statusMessage) return 0;

    const lower = statusMessage.toLowerCase();

    if (lower.includes('initializing') || lower.includes('knowledge graph')) return 0;
    if (lower.includes('crawling') || lower.includes('discovering') || lower.includes('structure')) return 1;
    if (lower.includes('analyzing') || lower.includes('retrieval') || lower.includes('vector')) return 2;
    if (lower.includes('generating') || lower.includes('report') || lower.includes('complete')) return 3;

    return 0;
}
