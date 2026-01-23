import React from 'react';
import {
    Globe, MessageSquare, Zap, CheckCircle, ExternalLink,
    AlertCircle, Link2, Settings2, Database, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface Integration {
    id: string;
    name: string;
    description: string;
    category: 'Search' | 'Notification' | 'Automation';
    icon: React.ReactNode;
    status: 'connected' | 'disconnected' | 'coming_soon';
}

export const IntegrationHub: React.FC = () => {
    const { organization } = useAuth();
    const toast = useToast();

    const integrations: Integration[] = [
        {
            id: 'gsc',
            name: 'Google Search Console',
            description: 'Sync your crawl data and impressions with AI visibility metrics.',
            category: 'Search',
            icon: <Globe className="w-6 h-6 text-blue-400" />,
            status: 'disconnected'
        },
        {
            id: 'slack',
            name: 'Slack',
            description: 'Get real-time alerts when your AI visibility score drops.',
            category: 'Notification',
            icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
            status: 'disconnected'
        },
        {
            id: 'zapier',
            name: 'Zapier',
            description: 'Connect Cognition to 6,000+ apps for custom workflows.',
            category: 'Automation',
            icon: <Zap className="w-6 h-6 text-orange-400" />,
            status: 'disconnected'
        },
        {
            id: 'perplexity',
            name: 'Perplexity API',
            description: 'Direct verification of citations using Perplexity Labs.',
            category: 'Search',
            icon: <Link2 className="w-6 h-6 text-cyan-400" />,
            status: 'connected'
        }
    ];

    const handleConnect = (id: string) => {
        toast.info(
            'Integration Pending',
            `The ${id.toUpperCase()} integration is being enabled for your organization. Please contact enterprise support for setup.`
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-3 rounded-xl">
                        <Link2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-semibold text-white">Integration Hub</h3>
                        <p className="text-sm text-slate-400">Connect Cognition to your existing stack</p>
                    </div>
                </div>
            </div>

            {/* Integration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration) => (
                    <div
                        key={integration.id}
                        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="bg-slate-800 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                {integration.icon}
                            </div>
                            <div className="flex items-center gap-2">
                                {integration.status === 'connected' ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded-full border border-emerald-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        Active
                                    </span>
                                ) : integration.status === 'coming_soon' ? (
                                    <span className="px-3 py-1 bg-slate-800 text-slate-500 text-[10px] font-bold uppercase rounded-full">
                                        Coming Soon
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase rounded-full">
                                        Disconnected
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-left">
                            <h4 className="text-white font-bold mb-1">{integration.name}</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                {integration.description}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {integration.category}
                                </span>
                                {integration.status !== 'connected' && integration.status !== 'coming_soon' && (
                                    <button
                                        onClick={() => handleConnect(integration.id)}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        Connect Service <ExternalLink className="w-3 h-3" />
                                    </button>
                                )}
                                {integration.status === 'connected' && (
                                    <button className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
                                        Manage <Settings2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Enterprise Banner */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-primary p-3 rounded-full text-white">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold">Custom Database Integration</h4>
                            <p className="text-sm text-slate-400">Export visibility data directly to your BigQuery, Snowflake, or RDS instance.</p>
                        </div>
                    </div>
                    <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap">
                        Inquire for Enterprise
                    </button>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            </div>
        </div>
    );
};
