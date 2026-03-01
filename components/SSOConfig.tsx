import React, { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle2, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { getSSOConfig, registerSAMLIdP, SAMLConfig } from '../services/ssoService';

export const SSOConfig: React.FC = () => {
    const { organization } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // SSO configuration state - connected to database
    const [ssoEnabled, setSsoEnabled] = useState(false);
    const [idpUrl, setIdpUrl] = useState('');
    const [certFingerprint, setCertFingerprint] = useState('');
    const [existingConfig, setExistingConfig] = useState<SAMLConfig | null>(null);

    const isEnterprise = organization?.plan === 'enterprise';

    // Load existing SSO configuration on mount
    useEffect(() => {
        async function loadConfig() {
            if (!organization?.id) {
                setLoadingConfig(false);
                return;
            }

            try {
                const config = await getSSOConfig(organization.id);
                if (config) {
                    setExistingConfig(config);
                    setIdpUrl(config.metadata_url || '');
                    setSsoEnabled(true);
                }
            } catch (error) {
                console.error('Failed to load SSO config:', error);
            } finally {
                setLoadingConfig(false);
            }
        }

        loadConfig();
    }, [organization?.id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization?.id) return;

        setLoading(true);
        try {
            const success = await registerSAMLIdP({
                organizationId: organization.id,
                metadataUrl: idpUrl,
                certFingerprint
            });

            if (success) {
                setSsoEnabled(true);
                toast.success("SSO Configuration Saved", "Your organization now requires SSO for login.");
            } else {
                toast.error("Configuration Failed", "Could not save SSO settings. Please try again.");
            }
        } catch (error) {
            console.error('SSO save error:', error);
            toast.error("Configuration Failed", "An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    if (!isEnterprise) {
        return (
            <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-2xl p-8 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                <div className="relative z-10">
                    <Shield className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">Enterprise Grade Security</h2>
                    <p className="text-slate-400 max-w-lg mx-auto mb-8 text-lg">
                        Enforce Single Sign-On (SAML/OIDC) via Okta, Azure AD, or Google Workspace.
                        Protect your data with bank-grade encryption and compliance logs.
                    </p>
                    <a
                        href="/settings/billing"
                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-105"
                    >
                        <Lock className="w-5 h-5" />
                        Upgrade to Enterprise
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-6 h-6 text-emerald-400" />
                        Single Sign-On (SSO)
                    </h3>
                    <p className="text-slate-400 mt-1">Configure SAML 2.0 or OIDC Identity Providers.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase">Enterprise Active</span>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Identity Provider URL (IdP)</label>
                        <div className="relative">
                            <input
                                type="url"
                                required
                                value={idpUrl}
                                onChange={e => setIdpUrl(e.target.value)}
                                placeholder="https://idp.okta.com/app/..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">X.509 Cert Fingerprint</label>
                        <textarea
                            required
                            value={certFingerprint}
                            onChange={e => setCertFingerprint(e.target.value)}
                            rows={3}
                            placeholder="SHA-256 Fingerprint..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs transition-all"
                        />
                    </div>

                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-200/80 leading-relaxed">
                            Enabling SSO will disable password authentication for all users in this organization.
                            Ensure your IdP is correctly configured to avoid lockout.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                        {ssoEnabled ? 'Update Configuration' : 'Enable SSO Enforcement'}
                    </button>
                </form>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h4 className="font-bold text-white mb-4">Supported Providers</h4>
                    <div className="space-y-3">
                        {['Okta', 'Azure Active Directory', 'Google Workspace', 'OneLogin', 'PingIdentity'].map(p => (
                            <div key={p} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg group hover:border-slate-600 transition-colors cursor-pointer">
                                <span className="text-slate-300 font-medium">{p}</span>
                                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <h4 className="font-bold text-white mb-2">Service Provider Details</h4>
                        <p className="text-xs text-slate-500 mb-4">Use these values to configure your IdP application.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">ACS URL</label>
                                <div className="font-mono text-xs text-blue-400 bg-blue-500/10 p-2 rounded border border-blue-500/20 truncate">
                                    https://api.cognition.ai/auth/v1/sso/saml/acs
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Entity ID</label>
                                <div className="font-mono text-xs text-blue-400 bg-blue-500/10 p-2 rounded border border-blue-500/20 truncate">
                                    urn:amazon:cognito:sp:us-east-1_cognition
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
