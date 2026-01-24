import React, { useState } from 'react';
import {
    Terminal,
    Copy,
    Check,
    ChevronRight,
    Shield,
    Zap,
    Activity,
    Users,
    Search,
    BookOpen,
    Code as CodeIcon,
    Cpu,
    Webhook as WebhookIcon,
    ArrowUpRight
} from 'lucide-react';

interface Endpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    title: string;
    description: string;
    parameters?: Array<{ name: string; type: string; required: boolean; description: string }>;
    response: any;
    samples: Array<{ lang: string; code: string }>;
}

const ENDPOINTS: Endpoint[] = [
    {
        id: 'auth',
        method: 'GET',
        path: '/v1/usage',
        title: 'Authentication & Usage',
        description: 'Authentication is handled via the `x-api-key` header. You can get your credit balance and monthly usage stats here.',
        response: {
            credits: { audits: 142, rewrites: 1950 },
            usage_this_month: 25,
            plan: "professional"
        },
        samples: [
            { lang: 'bash', code: 'curl -X GET https://api.cognition-ai.com/v1/usage \\\n  -H "x-api-key: YOUR_API_KEY"' },
            { lang: 'javascript', code: 'const res = await fetch("https://api.cognition-ai.com/v1/usage", {\n  headers: { "x-api-key": "YOUR_API_KEY" }\n});\nconst data = await res.json();' }
        ]
    },
    {
        id: 'list-audits',
        method: 'GET',
        path: '/v1/audits',
        title: 'List Audits',
        description: 'Returns the 20 most recent audits completed by your organization.',
        response: {
            audits: [
                { id: "aud_123", domain_url: "example.com", overall_score: 85, status: "complete", created_at: "2024-03-20T12:00:00Z" }
            ]
        },
        samples: [
            { lang: 'bash', code: 'curl -X GET https://api.cognition-ai.com/v1/audits \\\n  -H "x-api-key: YOUR_API_KEY"' }
        ]
    },
    {
        id: 'create-audit',
        method: 'POST',
        path: '/v1/audits',
        title: 'Create Audit',
        description: 'Trigger a new AI Visibility Audit for a specific URL. This will consume 1 credit.',
        parameters: [
            { name: 'url', type: 'string', required: true, description: 'The website URL to analyze.' },
            { name: 'otherAssets', type: 'string', required: false, description: 'Additional context or competitor URLs.' }
        ],
        response: {
            success: true,
            audit: { id: "aud_456", domain_url: "google.com", status: "complete", overall_score: 92 }
        },
        samples: [
            { lang: 'bash', code: 'curl -X POST https://api.cognition-ai.com/v1/audits \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"url": "https://google.com"}\'' }
        ]
    },
    {
        id: 'competitors',
        method: 'GET',
        path: '/v1/competitors',
        title: 'List Competitors',
        description: 'Retrieve all domains tracked as competitors for your organization.',
        response: {
            competitors: [
                { id: "comp_1", domain_url: "competitor.com", name: "Competitor A" }
            ]
        },
        samples: [
            { lang: 'bash', code: 'curl -X GET https://api.cognition-ai.com/v1/competitors \\\n  -H "x-api-key: YOUR_API_KEY"' }
        ]
    }
];

export const APIDocs: React.FC = () => {
    const [activeEndpointId, setActiveEndpointId] = useState(ENDPOINTS[0].id);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="flex h-screen bg-[#020617] text-slate-300 overflow-hidden font-inter">
            {/* Left Sidebar: Navigation */}
            <div className="w-72 border-r border-white/5 flex flex-col pt-8 bg-slate-950/50">
                <div className="px-6 mb-8 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">Cognition API</span>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2 mt-4">Getting Started</div>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Introduction
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Authentication
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Errors
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors flex items-center gap-2">
                        <WebhookIcon className="w-4 h-4" />
                        Webhooks
                    </button>

                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2 mt-8">Endpoints</div>
                    {ENDPOINTS.map(ep => (
                        <button
                            key={ep.id}
                            onClick={() => setActiveEndpointId(ep.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeEndpointId === ep.id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-slate-400'
                                }`}
                        >
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                {ep.method}
                            </span>
                            {ep.title}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <a href="/dashboard" className="flex items-center justify-between text-xs text-slate-500 hover:text-white transition-colors group">
                        Back to Dashboard
                        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>
            </div>

            {/* Main Content Area: Prose + Samples */}
            <div className="flex-1 flex overflow-hidden">
                {/* Center: Prose (Documentation) */}
                <div className="flex-1 overflow-y-auto px-12 py-16 custom-scrollbar">
                    {ENDPOINTS.map(ep => (
                        <div
                            key={ep.id}
                            className={`mb-24 transition-opacity duration-300 ${activeEndpointId === ep.id ? 'opacity-100' : 'opacity-30'}`}
                            id={ep.id}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    }`}>
                                    {ep.method}
                                </span>
                                <code className="text-sm font-mono text-slate-400">{ep.path}</code>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{ep.title}</h2>
                            <p className="text-slate-400 leading-relaxed mb-8 max-w-2xl text-lg">
                                {ep.description}
                            </p>

                            {ep.parameters && (
                                <div className="mb-8">
                                    <h4 className="text-sm uppercase tracking-wider font-bold text-slate-500 mb-4">Request Parameters</h4>
                                    <div className="space-y-4 border-t border-white/5 pt-4">
                                        {ep.parameters.map(p => (
                                            <div key={p.name} className="flex gap-4">
                                                <div className="w-32">
                                                    <code className="text-indigo-400 text-sm font-bold">{p.name}</code>
                                                    <div className="text-[10px] text-slate-500 font-mono mt-1">{p.type}</div>
                                                </div>
                                                <div className="flex-1 text-sm leading-relaxed">
                                                    <span className="text-rose-500/80 text-[10px] font-bold uppercase mr-2">{p.required ? 'Required' : 'Optional'}</span>
                                                    {p.description}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm uppercase tracking-wider font-bold text-slate-500 mb-4">Response Sample</h4>
                                <div className="bg-[#0f172a] rounded-xl border border-white/5 p-4 overflow-x-auto font-mono text-sm group relative">
                                    <pre className="text-blue-300">{JSON.stringify(ep.response, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Code Samples */}
                <div className="w-[450px] bg-slate-900/30 border-l border-white/5 overflow-y-auto px-6 py-16 hidden lg:block custom-scrollbar">
                    {ENDPOINTS.map(ep => (
                        <div
                            key={`${ep.id}-sample`}
                            className={`mb-24 transition-opacity duration-300 ${activeEndpointId === ep.id ? 'opacity-100' : 'opacity-10'}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    {ep.samples.map((s, idx) => (
                                        <button key={idx} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white pb-1 border-b-2 border-transparent hover:border-indigo-500 transition-all">
                                            {s.lang === 'bash' ? 'cURL' : s.lang === 'javascript' ? 'JavaScript' : s.lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {ep.samples.map((s, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(s.code, `${ep.id}-${idx}`)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                                            >
                                                {copied === `${ep.id}-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                            </button>
                                        </div>
                                        <div className="bg-slate-950 rounded-xl border border-white/10 p-5 font-mono text-[13px] leading-relaxed overflow-x-auto min-h-[120px] flex items-center">
                                            <code className="text-indigo-300 block whitespace-pre">
                                                {s.code}
                                            </code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
