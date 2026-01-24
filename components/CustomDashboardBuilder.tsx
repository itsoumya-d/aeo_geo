import React, { useState, useEffect } from 'react';
import {
    LayoutGrid, Plus, X, GripVertical, Settings,
    BarChart3, TrendingUp, Users, Target, Zap, Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';

// Widget type definitions
export type WidgetType =
    | 'visibility_score'
    | 'platform_breakdown'
    | 'recommendations'
    | 'competitor_comparison'
    | 'trend_chart'
    | 'recent_audits';

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    size: 'small' | 'medium' | 'large';
    position: number;
}

interface DashboardConfig {
    id?: string;
    organization_id: string;
    name: string;
    widgets: DashboardWidget[];
    is_default: boolean;
    created_at?: string;
}

const WIDGET_TEMPLATES: { type: WidgetType; title: string; icon: React.ReactNode; defaultSize: DashboardWidget['size'] }[] = [
    { type: 'visibility_score', title: 'Visibility Score', icon: <Target className="w-4 h-4" />, defaultSize: 'small' },
    { type: 'platform_breakdown', title: 'Platform Breakdown', icon: <BarChart3 className="w-4 h-4" />, defaultSize: 'medium' },
    { type: 'recommendations', title: 'Top Recommendations', icon: <Zap className="w-4 h-4" />, defaultSize: 'large' },
    { type: 'competitor_comparison', title: 'Competitor Comparison', icon: <Users className="w-4 h-4" />, defaultSize: 'medium' },
    { type: 'trend_chart', title: 'Visibility Trends', icon: <TrendingUp className="w-4 h-4" />, defaultSize: 'large' },
    { type: 'recent_audits', title: 'Recent Audits', icon: <LayoutGrid className="w-4 h-4" />, defaultSize: 'medium' },
];

export const CustomDashboardBuilder: React.FC = () => {
    const { organization } = useAuth();
    const toast = useToast();

    const [config, setConfig] = useState<DashboardConfig>({
        organization_id: organization?.id || '',
        name: 'My Dashboard',
        widgets: [],
        is_default: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            loadDashboardConfig();
        }
    }, [organization?.id]);

    const loadDashboardConfig = async () => {
        if (!organization?.id) return;

        const { data, error } = await supabase
            .from('dashboard_configs')
            .select('*')
            .eq('organization_id', organization.id)
            .eq('is_default', true)
            .maybeSingle();

        if (data) {
            setConfig({
                ...data,
                widgets: data.widgets || []
            });
        }
    };

    const handleSave = async () => {
        if (!organization?.id) return;
        setSaving(true);

        try {
            const payload = {
                ...config,
                organization_id: organization.id,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('dashboard_configs')
                .upsert(payload, { onConflict: 'organization_id,is_default' });

            if (error) throw error;

            toast.success('Dashboard saved', 'Your custom layout has been saved.');
            setIsEditing(false);
        } catch (error: any) {
            toast.error('Save failed', error.message);
        } finally {
            setSaving(false);
        }
    };

    const addWidget = (type: WidgetType) => {
        const template = WIDGET_TEMPLATES.find(t => t.type === type);
        if (!template) return;

        const newWidget: DashboardWidget = {
            id: `widget_${Date.now()}`,
            type,
            title: template.title,
            size: template.defaultSize,
            position: config.widgets.length
        };

        setConfig(prev => ({
            ...prev,
            widgets: [...prev.widgets, newWidget]
        }));
    };

    const removeWidget = (widgetId: string) => {
        setConfig(prev => ({
            ...prev,
            widgets: prev.widgets.filter(w => w.id !== widgetId)
        }));
    };

    const updateWidgetSize = (widgetId: string, size: DashboardWidget['size']) => {
        setConfig(prev => ({
            ...prev,
            widgets: prev.widgets.map(w =>
                w.id === widgetId ? { ...w, size } : w
            )
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-3 rounded-xl">
                        <LayoutGrid className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Custom Dashboard</h3>
                        <p className="text-sm text-text-secondary">
                            {config.widgets.length} widgets configured
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Layout'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 bg-surface border border-border hover:border-primary text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Customize
                        </button>
                    )}
                </div>
            </div>

            {/* Widget Palette (Edit Mode) */}
            {isEditing && (
                <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                        Add Widgets
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {WIDGET_TEMPLATES.map(template => (
                            <button
                                key={template.type}
                                onClick={() => addWidget(template.type)}
                                className="flex items-center gap-2 bg-background hover:bg-primary/10 border border-border hover:border-primary text-text-primary px-3 py-2 rounded-lg text-sm transition-colors"
                            >
                                {template.icon}
                                {template.title}
                                <Plus className="w-3 h-3" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Widget Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.widgets.map(widget => (
                    <div
                        key={widget.id}
                        className={`
                            bg-surface border border-border rounded-xl p-4
                            ${widget.size === 'large' ? 'md:col-span-2 lg:col-span-3' : ''}
                            ${widget.size === 'medium' ? 'md:col-span-2 lg:col-span-2' : ''}
                            ${isEditing ? 'ring-2 ring-primary/20' : ''}
                        `}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {isEditing && <GripVertical className="w-4 h-4 text-text-muted cursor-move" />}
                                <span className="font-medium text-white">{widget.title}</span>
                            </div>
                            {isEditing && (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={widget.size}
                                        onChange={(e) => updateWidgetSize(widget.id, e.target.value as any)}
                                        className="bg-background border border-border text-text-primary rounded px-2 py-1 text-xs"
                                    >
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                    <button
                                        onClick={() => removeWidget(widget.id)}
                                        className="text-text-muted hover:text-rose-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="h-32 bg-background/50 rounded-lg flex items-center justify-center text-text-muted text-sm">
                            {widget.type.replace(/_/g, ' ')} widget placeholder
                        </div>
                    </div>
                ))}
            </div>

            {config.widgets.length === 0 && (
                <div className="text-center py-12 bg-surface border border-border rounded-xl">
                    <LayoutGrid className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-secondary mb-2">No widgets configured</p>
                    <p className="text-sm text-text-muted">
                        Click "Customize" to add widgets to your dashboard
                    </p>
                </div>
            )}
        </div>
    );
};

export default CustomDashboardBuilder;
