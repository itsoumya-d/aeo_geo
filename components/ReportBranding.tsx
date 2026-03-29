import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Palette, Image, Upload, Check, Loader2, Eye, RefreshCw,
    AlertTriangle
} from 'lucide-react';

interface BrandingSettings {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    company_name: string;
    hide_cognition_branding: boolean;
}

const DEFAULT_BRANDING: BrandingSettings = {
    logo_url: null,
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    company_name: '',
    hide_cognition_branding: false,
};

const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (color: string) => void;
}> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>
        <div className="flex items-center gap-3">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-11 h-11 rounded-xl cursor-pointer border border-blue-200 bg-white p-0.5"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-white border border-blue-100 text-slate-700 rounded-xl px-4 py-2.5 font-mono text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none uppercase"
                placeholder="#3b82f6"
            />
        </div>
    </div>
);

export const ReportBranding: React.FC = () => {
    const { organization, profile } = useAuth();
    const toast = useToast();

    const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isAgencyPlan = organization?.plan === 'agency' || organization?.plan === 'enterprise';
    const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';

    useEffect(() => {
        if (organization?.id) {
            loadBranding();
        }
    }, [organization?.id]);

    const loadBranding = async () => {
        if (!organization?.id) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('organization_branding')
                .select('*')
                .eq('organization_id', organization.id)
                .single();

            if (data) {
                setBranding({
                    logo_url: data.logo_url,
                    primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
                    secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
                    company_name: data.company_name || '',
                    hide_cognition_branding: data.hide_cognition_branding || false,
                });
            }
        } catch (error: any) {
            // No existing branding, use defaults
            setBranding({
                ...DEFAULT_BRANDING,
                company_name: organization.name || '',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!organization?.id) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('organization_branding')
                .upsert({
                    organization_id: organization.id,
                    ...branding,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            toast.success('Branding saved', 'Your custom branding will appear on exported reports.');
            setHasChanges(false);
        } catch (error: any) {
            console.error('Save branding failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !organization?.id) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type', 'Please upload PNG, JPG, SVG, or WebP');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File too large', 'Maximum file size is 2MB');
            return;
        }

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${organization.id}/logo.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('branding')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('branding')
                .getPublicUrl(fileName);

            updateBranding({ logo_url: urlData.publicUrl });
            toast.success('Logo uploaded', 'Your logo has been saved');
        } catch (error: any) {
            console.error('Upload error:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setSaving(false);
        }
    };

    const updateBranding = (updates: Partial<BrandingSettings>) => {
        setBranding(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    if (!isAgencyPlan) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Palette className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">White-Label Reports</h3>
                <p className="text-sm text-blue-700 mb-6 max-w-sm mx-auto">
                    Add your logo, brand colors, and company name to exported PDF reports. Remove "Powered by Cognition" branding. Available on Agency and Enterprise plans.
                </p>
                <a
                    href="/settings/billing"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                    Upgrade to Agency — $399/mo
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-blue-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <Palette className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Report Branding</h3>
                        <p className="text-sm text-slate-500">Customize exported PDF reports with your agency branding</p>
                    </div>
                </div>
                {hasChanges && isOwnerOrAdmin && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Changes
                    </button>
                )}
            </div>

            {/* Branding Form */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column - Settings */}
                <div className="space-y-6">
                    {/* Company Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Company Name</label>
                        <input
                            type="text"
                            value={branding.company_name}
                            onChange={(e) => updateBranding({ company_name: e.target.value })}
                            placeholder="Your Agency Name"
                            className="w-full bg-white border border-blue-100 text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none placeholder:text-slate-400 transition-all"
                        />
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Company Logo</label>
                        {branding.logo_url && (
                            <div className="flex items-center gap-3 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <img
                                    src={branding.logo_url}
                                    alt="Current logo"
                                    className="h-8 w-auto object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="text-xs text-slate-500 truncate flex-1">Logo uploaded</span>
                                <button
                                    onClick={() => updateBranding({ logo_url: null })}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >Remove</button>
                            </div>
                        )}
                        <label className="flex items-center justify-center gap-2 w-full bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 text-blue-600 hover:bg-blue-50 px-4 py-4 rounded-xl cursor-pointer transition-all">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm font-semibold">Upload Logo</span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                        </label>
                        <p className="text-xs text-slate-400 mt-1.5">PNG, JPG, SVG, or WebP · Max 2MB · Recommended: 400×100px</p>
                    </div>

                    {/* Colors */}
                    <ColorPicker
                        label="Primary Color"
                        value={branding.primary_color}
                        onChange={(color) => updateBranding({ primary_color: color })}
                    />
                    <ColorPicker
                        label="Accent Color"
                        value={branding.secondary_color}
                        onChange={(color) => updateBranding({ secondary_color: color })}
                    />

                    {/* Hide Cognition Branding */}
                    <div className="flex items-center justify-between py-4 border-t border-blue-100">
                        <div>
                            <p className="font-semibold text-slate-700 text-sm">Remove Cognition Branding</p>
                            <p className="text-xs text-slate-500 mt-0.5">Hide "Powered by Cognition" footer from reports</p>
                        </div>
                        <button
                            onClick={() => updateBranding({ hide_cognition_branding: !branding.hide_cognition_branding })}
                            aria-checked={branding.hide_cognition_branding}
                            role="switch"
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                branding.hide_cognition_branding ? 'bg-blue-600' : 'bg-slate-200'
                            }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                branding.hide_cognition_branding ? 'translate-x-5' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                </div>

                {/* Right Column - Live Preview */}
                <div className="bg-slate-50 border border-blue-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-500">Report Header Preview</span>
                    </div>

                    {/* Preview card */}
                    <div
                        className="bg-white rounded-xl shadow-sm overflow-hidden"
                        style={{ borderTop: `4px solid ${branding.primary_color}` }}
                    >
                        <div className="px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {branding.logo_url ? (
                                        <img
                                            src={branding.logo_url}
                                            alt="Logo"
                                            className="h-10 w-auto object-contain"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                            style={{ backgroundColor: branding.primary_color }}
                                        >
                                            {branding.company_name?.charAt(0)?.toUpperCase() || 'A'}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">
                                            {branding.company_name || 'Your Agency Name'}
                                        </h4>
                                        <p className="text-xs text-slate-500">AI Visibility Report · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Score</p>
                                    <p className="text-2xl font-black" style={{ color: branding.primary_color }}>72</p>
                                </div>
                            </div>

                            {/* Color preview bar */}
                            <div className="mt-4 h-1 rounded-full overflow-hidden flex gap-0.5">
                                <div className="flex-1" style={{ backgroundColor: branding.primary_color }} />
                                <div className="flex-1" style={{ backgroundColor: branding.secondary_color }} />
                                <div className="flex-1 bg-slate-200" />
                            </div>
                        </div>

                        {!branding.hide_cognition_branding && (
                            <div className="px-6 py-3 border-t border-slate-100 text-[10px] text-slate-400 text-center bg-slate-50">
                                Powered by Cognition AI Visibility Engine
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-slate-400 mt-3 text-center">Live preview — changes appear instantly</p>
                </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Applies to PDF exports only.</span>{' '}
                    Custom branding will appear on downloaded PDF reports and shared public report links.
                </div>
            </div>
        </div>
    );
};
