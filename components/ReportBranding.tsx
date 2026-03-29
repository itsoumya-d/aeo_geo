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
        <label className="block text-sm text-text-muted mb-2">{label}</label>
        <div className="flex items-center gap-3">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-border bg-transparent"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-surfaceHighlight border border-border text-white rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-primary outline-none uppercase"
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
            <div className="bg-surfaceHighlight border border-border rounded-xl p-6 text-center">
                <Palette className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">White-Label Reports</h3>
                <p className="text-sm text-text-muted mb-4">
                    Customize reports with your branding on Agency and Enterprise plans.
                </p>
                <a
                    href="/settings/billing"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    Upgrade to Agency
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-3 rounded-xl">
                        <Palette className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Report Branding</h3>
                        <p className="text-sm text-text-muted">Customize exported PDF reports</p>
                    </div>
                </div>
                {hasChanges && isOwnerOrAdmin && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
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
                        <label className="block text-sm text-text-muted mb-2">Company Name</label>
                        <input
                            type="text"
                            value={branding.company_name}
                            onChange={(e) => updateBranding({ company_name: e.target.value })}
                            placeholder="Your Company Name"
                            className="w-full bg-surfaceHighlight border border-border text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-500"
                        />
                    </div>

                    {/* Logo Upload/URL */}
                    <div>
                        <label className="block text-sm text-text-muted mb-2">Company Logo</label>
                        <div className="flex gap-3">
                            <input
                                type="url"
                                value={branding.logo_url || ''}
                                onChange={(e) => updateBranding({ logo_url: e.target.value || null })}
                                placeholder="https://example.com/logo.png"
                                className="flex-1 bg-surfaceHighlight border border-border text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-500"
                            />
                            <label className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2.5 rounded-lg cursor-pointer transition-colors">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm font-medium">Upload</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG, or WebP (max 2MB)</p>
                    </div>

                    {/* Colors */}
                    <ColorPicker
                        label="Primary Color"
                        value={branding.primary_color}
                        onChange={(color) => updateBranding({ primary_color: color })}
                    />
                    <ColorPicker
                        label="Secondary Color"
                        value={branding.secondary_color}
                        onChange={(color) => updateBranding({ secondary_color: color })}
                    />

                    {/* Hide Cognition Branding */}
                    <div className="flex items-center justify-between py-4 border-t border-border">
                        <div>
                            <p className="font-medium text-white">Hide Cognition Branding</p>
                            <p className="text-sm text-text-muted">Remove "Powered by Cognition" from reports</p>
                        </div>
                        <button
                            onClick={() => updateBranding({ hide_cognition_branding: !branding.hide_cognition_branding })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${branding.hide_cognition_branding ? 'bg-primary' : 'bg-slate-700'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${branding.hide_cognition_branding ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>
                </div>

                {/* Right Column - Preview */}
                <div className="bg-surfaceHighlight border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-4 h-4 text-text-muted" />
                        <span className="text-sm font-medium text-text-muted">Report Header Preview</span>
                    </div>

                    <div
                        className="bg-white rounded-lg p-6"
                        style={{
                            borderTop: `4px solid ${branding.primary_color}`
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {branding.logo_url ? (
                                    <img
                                        src={branding.logo_url}
                                        alt="Logo"
                                        className="h-10 w-auto object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: branding.primary_color }}
                                    >
                                        {branding.company_name?.charAt(0) || 'C'}
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-slate-900">
                                        {branding.company_name || 'Your Company'}
                                    </h4>
                                    <p className="text-xs text-slate-500">AI Visibility Report</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-700">Score</p>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: branding.primary_color }}
                                >
                                    72
                                </p>
                            </div>
                        </div>

                        {!branding.hide_cognition_branding && (
                            <div className="pt-4 border-t border-slate-200 text-xs text-text-muted text-center">
                                Powered by Cognition AI Visibility Engine
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Notice */}
            <div className="bg-surfaceHighlight border border-border rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-sm text-text-muted">
                    <p className="font-medium text-text-secondary mb-1">Branding applies to exports only</p>
                    <p>Custom branding will appear on PDF exports and shared report links.</p>
                </div>
            </div>
        </div>
    );
};
