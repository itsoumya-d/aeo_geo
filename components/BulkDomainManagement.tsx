import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import {
    Files, Upload, Download, Trash2, Loader2, Search,
    Globe, CheckCircle2, AlertCircle, Play
} from 'lucide-react';

interface BulkDomain {
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    score?: number;
}

export const BulkDomainManagement: React.FC = () => {
    const { organization } = useAuth();
    const toast = useToast();

    const [domains, setDomains] = useState<BulkDomain[]>([]);
    const [bulkInput, setBulkInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [loading, setLoading] = useState(false);

    const isEnterprisePlan = organization?.plan === 'agency' || organization?.plan === 'enterprise';

    const handleAddDomains = () => {
        const urls = bulkInput
            .split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);

        if (urls.length === 0) return;

        // Simple validation
        const validUrls = urls.map(url => {
            let formatted = url;
            if (!url.startsWith('http')) formatted = `https://${url}`;
            return { url: formatted, status: 'pending' as const };
        });

        setDomains(prev => [...prev, ...validUrls]);
        setBulkInput('');
    };

    const handleRunBulkAudit = async () => {
        if (domains.length === 0) return;
        setIsProcessing(true);
        toast.info("Bulk Audit Started", `Processing ${domains.length} domains...`);

        // In a real implementation, this would trigger a background job or loop through audits
        // We'll simulate the process and update the UI
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            setDomains(prev => prev.map((d, index) =>
                index === i ? { ...d, status: 'processing' } : d
            ));

            // Simulate audit delay
            await new Promise(r => setTimeout(r, 2000));

            const success = Math.random() > 0.1;
            setDomains(prev => prev.map((d, index) =>
                index === i ? {
                    ...d,
                    status: success ? 'completed' : 'failed',
                    score: success ? Math.floor(Math.random() * 40) + 60 : undefined
                } : d
            ));
        }

        setIsProcessing(false);
        toast.success("Bulk Audit Complete", "Review the results below.");
    };

    const handleClear = () => {
        if (confirm("Clear all domains?")) {
            setDomains([]);
        }
    };

    if (!isEnterprisePlan) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <Files className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Bulk Domain Management</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Manage and audit up to 100 domains at once on Enterprise plans.
                </p>
                <a
                    href="/settings?tab=billing"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    Contact Sales for Enterprise
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-3 rounded-xl">
                        <Files className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Bulk Management</h3>
                        <p className="text-sm text-slate-400">{domains.length} domains in queue</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleClear}
                        disabled={domains.length === 0 || isProcessing}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={handleRunBulkAudit}
                        disabled={domains.length === 0 || isProcessing}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Run Bulk Audit
                    </button>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                    Add Domains (one per line)
                </label>
                <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder="example.com&#10;google.com&#10;openai.com"
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-600 font-mono text-sm mb-3"
                />
                <button
                    onClick={handleAddDomains}
                    disabled={!bulkInput.trim()}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                    <Upload className="w-4 h-4" />
                    Import List
                </button>
            </div>

            {/* Results Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-sm font-medium">
                            <th className="px-6 py-4">Domain</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Visibility Score</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {domains.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    No domains added yet. Use the import box above to start.
                                </td>
                            </tr>
                        ) : (
                            domains.map((domain, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-4 h-4 text-slate-500" />
                                            <span className="font-medium text-white">{domain.url}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {domain.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                            {domain.status === 'failed' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                                            {domain.status === 'processing' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                            {domain.status === 'pending' && <div className="w-4 h-4 rounded-full border border-slate-600" />}
                                            <span className={`text-xs capitalize font-medium ${domain.status === 'completed' ? 'text-emerald-400' :
                                                    domain.status === 'failed' ? 'text-rose-400' :
                                                        domain.status === 'processing' ? 'text-primary' :
                                                            'text-slate-500'
                                                }`}>
                                                {domain.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {domain.score ? (
                                            <span className={`font-bold ${domain.score > 75 ? 'text-emerald-400' :
                                                    domain.score > 50 ? 'text-amber-400' :
                                                        'text-rose-400'
                                                }`}>
                                                {domain.score}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setDomains(prev => prev.filter((_, i) => i !== index))}
                                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bulk Actions */}
            <div className="flex justify-end gap-3">
                <button
                    disabled={domains.filter(d => d.status === 'completed').length === 0}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>
        </div>
    );
};
