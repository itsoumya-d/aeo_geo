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
    ArrowUpRight,
    Play
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

const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1`
    : 'https://api.cognition-ai.com/v1';

const ENDPOINTS: Endpoint[] = [
    {
        id: 'auth',
        method: 'GET',
        path: '/usage',
        title: 'Authentication & Usage',
        description: 'Authentication is handled via the `x-api-key` header. You can get your credit balance and monthly usage stats here.',
        response: {
            credits: { audits: 142, rewrites: 1950 },
            usage_this_month: 25,
            plan: "professional"
        },
        samples: [
            { lang: 'bash', code: `curl -X GET ${API_BASE_URL}/usage \\\n  -H "x-api-key: YOUR_API_KEY"` },
            { lang: 'javascript', code: `const res = await fetch("${API_BASE_URL}/usage", {\n  headers: { "x-api-key": "YOUR_API_KEY" }\n});\nconst data = await res.json();` },
            { lang: 'python', code: `import requests\n\nurl = "${API_BASE_URL}/usage"\nheaders = {"x-api-key": "YOUR_API_KEY"}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())` }
        ]
    },
    {
        id: 'list-audits',
        method: 'GET',
        path: '/audits',
        title: 'List Audits',
        description: 'Returns the 20 most recent audits completed by your organization.',
        response: {
            audits: [
                { id: "aud_123", domain_url: "example.com", overall_score: 85, status: "complete", created_at: "2024-03-20T12:00:00Z" }
            ]
        },
        samples: [
            { lang: 'bash', code: `curl -X GET ${API_BASE_URL}/audits \\\n  -H "x-api-key: YOUR_API_KEY"` },
            { lang: 'javascript', code: `const res = await fetch("${API_BASE_URL}/audits", {\n  headers: { "x-api-key": "YOUR_API_KEY" }\n});\nconst data = await res.json();` },
            { lang: 'python', code: `import requests\n\nurl = "${API_BASE_URL}/audits"\nheaders = {"x-api-key": "YOUR_API_KEY"}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())` }
        ]
    },
    {
        id: 'create-audit',
        method: 'POST',
        path: '/audits',
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
            { lang: 'bash', code: `curl -X POST ${API_BASE_URL}/audits \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://google.com"}'` },
            { lang: 'javascript', code: `const res = await fetch("${API_BASE_URL}/audits", {\n  method: "POST",\n  headers: { \n    "x-api-key": "YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ url: "https://google.com" })\n});\nconst data = await res.json();` },
            { lang: 'python', code: `import requests\n\nurl = "${API_BASE_URL}/audits"\nheaders = {\n    "x-api-key": "YOUR_API_KEY",\n    "Content-Type": "application/json"\n}\ndata = {"url": "https://google.com"}\n\nresponse = requests.post(url, headers=headers, json=data)\nprint(response.json())` }
        ]
    },
    {
        id: 'competitors',
        method: 'GET',
        path: '/competitors',
        title: 'List Competitors',
        description: 'Retrieve all domains tracked as competitors for your organization.',
        response: {
            competitors: [
                { id: "comp_1", domain_url: "competitor.com", name: "Competitor A" }
            ]
        },
        samples: [
            { lang: 'bash', code: `curl -X GET ${API_BASE_URL}/competitors \\\n  -H "x-api-key: YOUR_API_KEY"` },
            { lang: 'javascript', code: `const res = await fetch("${API_BASE_URL}/competitors", {\n  headers: { "x-api-key": "YOUR_API_KEY" }\n});\nconst data = await res.json();` },
            { lang: 'python', code: `import requests\n\nurl = "${API_BASE_URL}/competitors"\nheaders = {"x-api-key": "YOUR_API_KEY"}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())` }
        ]
    }
];

export const APIDocs: React.FC = () => {
    const [activeEndpointId, setActiveEndpointId] = useState(ENDPOINTS[0].id);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [activeLang, setActiveLang] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
    const [testResponse, setTestResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [params, setParams] = useState<Record<string, string>>({});

    const scrollToSection = (sectionId: string) => {
        setActiveSection(sectionId);
        setActiveEndpointId('');
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const getActiveLang = (epId: string) => activeLang[epId] || 'bash';

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const runTest = async (endpoint: Endpoint) => {
        if (!apiKey) {
            setTestResponse({ error: "Please enter your API Key first" });
            return;
        }

        setIsLoading(true);
        setTestResponse(null);

        try {
            const url = `${API_BASE_URL}${endpoint.path}`;
            const options: RequestInit = {
                method: endpoint.method,
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            };

            if (endpoint.method === 'POST' && endpoint.parameters) {
                const body: Record<string, any> = {};
                endpoint.parameters.forEach(p => {
                    if (params[p.name]) body[p.name] = params[p.name];
                });
                options.body = JSON.stringify(body);
            }

            const res = await fetch(url, options);
            const data = await res.json();
            setTestResponse(data);
        } catch (error: any) {
            setTestResponse({ error: error.message || "Failed to fetch" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-surface text-text-secondary font-inter">
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
                    <button onClick={() => scrollToSection('section-introduction')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'section-introduction' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-text-muted'}`}>
                        <BookOpen className="w-4 h-4" />
                        Introduction
                    </button>
                    <button onClick={() => scrollToSection('section-authentication')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'section-authentication' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-text-muted'}`}>
                        <Shield className="w-4 h-4" />
                        Authentication
                    </button>
                    <button onClick={() => scrollToSection('section-errors')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'section-errors' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-text-muted'}`}>
                        <Activity className="w-4 h-4" />
                        Errors
                    </button>
                    <button onClick={() => scrollToSection('section-webhooks')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'section-webhooks' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-text-muted'}`}>
                        <WebhookIcon className="w-4 h-4" />
                        Webhooks
                    </button>

                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 px-2 mt-8">Endpoints</div>
                    {ENDPOINTS.map(ep => (
                        <button
                            key={ep.id}
                            onClick={() => { setActiveEndpointId(ep.id); setActiveSection(null); const el = document.getElementById(ep.id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeEndpointId === ep.id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-white/5 text-text-muted'
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
                    {/* Getting Started Sections */}
                    <div id="section-introduction" className="mb-24">
                        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Introduction</h2>
                        <p className="text-text-muted leading-relaxed mb-6 max-w-2xl text-lg">
                            The Cognition API lets you programmatically run AI visibility audits, track competitors, and retrieve analysis data. All endpoints return JSON and use standard HTTP response codes.
                        </p>
                        <div className="bg-surface rounded-xl border border-white/5 p-4 font-mono text-sm">
                            <code className="text-indigo-300">Base URL: <span className="text-emerald-400">{API_BASE_URL}</span></code>
                        </div>
                    </div>

                    <div id="section-authentication" className="mb-24">
                        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Authentication</h2>
                        <p className="text-text-muted leading-relaxed mb-6 max-w-2xl text-lg">
                            All API requests require an API key passed via the <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-sm">x-api-key</code> header. You can generate and manage API keys from your dashboard Settings &gt; API Keys.
                        </p>
                        <div className="bg-surface rounded-xl border border-white/5 p-4 font-mono text-sm">
                            <code className="text-indigo-300 whitespace-pre">{`curl -X GET ${API_BASE_URL}/usage \\\n  -H "x-api-key: YOUR_API_KEY"`}</code>
                        </div>
                    </div>

                    <div id="section-errors" className="mb-24">
                        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Errors</h2>
                        <p className="text-text-muted leading-relaxed mb-6 max-w-2xl text-lg">
                            The API uses standard HTTP status codes. Errors include a JSON body with an <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-sm">error</code> field describing the issue.
                        </p>
                        <div className="space-y-3">
                            {[
                                { code: '400', desc: 'Bad Request — Missing or invalid parameters' },
                                { code: '401', desc: 'Unauthorized — Invalid or missing API key' },
                                { code: '403', desc: 'Forbidden — Insufficient permissions or plan limits reached' },
                                { code: '404', desc: 'Not Found — Resource does not exist' },
                                { code: '429', desc: 'Too Many Requests — Rate limit exceeded' },
                                { code: '500', desc: 'Internal Server Error — Something went wrong on our end' },
                            ].map(e => (
                                <div key={e.code} className="flex items-center gap-4 bg-surface rounded-xl border border-white/5 p-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${parseInt(e.code) >= 500 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : parseInt(e.code) >= 400 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                        {e.code}
                                    </span>
                                    <span className="text-sm text-text-muted">{e.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div id="section-webhooks" className="mb-24">
                        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Webhooks</h2>
                        <p className="text-text-muted leading-relaxed mb-6 max-w-2xl text-lg">
                            Configure webhooks from your dashboard to receive real-time notifications when audits complete, scores change, or scheduled tasks run. Webhooks send POST requests with a JSON payload signed using your webhook secret.
                        </p>
                        <div className="bg-surface rounded-xl border border-white/5 p-4 font-mono text-sm overflow-x-auto">
                            <pre className="text-blue-300">{JSON.stringify({
                                event: "audit.completed",
                                data: { audit_id: "aud_123", domain: "example.com", score: 85, completed_at: "2024-03-20T12:00:00Z" }
                            }, null, 2)}</pre>
                        </div>
                    </div>

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
                                <code className="text-sm font-mono text-text-muted">{ep.path}</code>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{ep.title}</h2>
                            <p className="text-text-muted leading-relaxed mb-8 max-w-2xl text-lg">
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
                                                    {testingEndpoint === ep.id && (
                                                        <input
                                                            type="text"
                                                            placeholder={`Value for ${p.name}`}
                                                            className="w-full mt-2 bg-surface border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                            onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Try It Section */}
                            <div className="mb-8 p-6 bg-surfaceHighlight rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm uppercase tracking-wider font-bold text-slate-500">Test Request</h4>
                                    <button
                                        onClick={() => {
                                            if (testingEndpoint === ep.id) {
                                                setTestingEndpoint(null);
                                                setTestResponse(null);
                                            } else {
                                                setTestingEndpoint(ep.id);
                                                setTestResponse(null);
                                            }
                                        }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                                    >
                                        {testingEndpoint === ep.id ? 'Hide Console' : 'Open Console'}
                                    </button>
                                </div>

                                {testingEndpoint === ep.id && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">API Key</label>
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={e => setApiKey(e.target.value)}
                                                placeholder="Enter your x-api-key..."
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                                            />
                                        </div>

                                        <button
                                            onClick={() => runTest(ep)}
                                            disabled={isLoading}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            {isLoading ? (
                                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                            ) : (
                                                <Play className="w-4 h-4 fill-current" />
                                            )}
                                            {isLoading ? 'Sending Request...' : 'Send Request'}
                                        </button>

                                        {testResponse && (
                                            <div className="mt-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-slate-500 uppercase">Response</span>
                                                    {testResponse.error ? (
                                                        <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded">Error</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">200 OK</span>
                                                    )}
                                                </div>
                                                <div className="bg-slate-950 rounded-lg border border-white/10 p-4 overflow-x-auto max-h-[300px] custom-scrollbar">
                                                    <pre className="text-xs font-mono text-blue-300">
                                                        {JSON.stringify(testResponse, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm uppercase tracking-wider font-bold text-slate-500 mb-4">Response Sample</h4>
                                <div className="bg-surface rounded-xl border border-white/5 p-4 overflow-x-auto font-mono text-sm group relative">
                                    <pre className="text-blue-300">{JSON.stringify(ep.response, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Code Samples */}
                <div className="w-[450px] bg-blue-50 border-l border-white/5 overflow-y-auto px-6 py-16 hidden lg:block custom-scrollbar">
                    {ENDPOINTS.map(ep => (
                        <div
                            key={`${ep.id}-sample`}
                            className={`mb-24 transition-opacity duration-300 ${activeEndpointId === ep.id ? 'opacity-100' : 'opacity-10'}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    {ep.samples.map((s, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveLang(prev => ({ ...prev, [ep.id]: s.lang }))}
                                            className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 transition-all ${getActiveLang(ep.id) === s.lang ? 'text-white border-indigo-500' : 'text-slate-500 hover:text-white border-transparent hover:border-indigo-500'}`}
                                        >
                                            {s.lang === 'bash' ? 'cURL' : s.lang === 'javascript' ? 'JavaScript' : s.lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {ep.samples.filter(s => s.lang === getActiveLang(ep.id)).map((s, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(s.code, `${ep.id}-${idx}`)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                                            >
                                                {copied === `${ep.id}-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-text-muted" />}
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
