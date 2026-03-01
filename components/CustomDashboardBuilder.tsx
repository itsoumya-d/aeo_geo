import React, { useState, useEffect } from 'react';
import {
    LayoutGrid, Plus, X, GripVertical, Settings,
    BarChart3, TrendingUp, Users, Target, Zap, Save, RotateCcw
} from 'lucide-react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';

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

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: 'default_1', type: 'visibility_score', title: 'Visibility Score', size: 'small', position: 0 },
    { id: 'default_2', type: 'platform_breakdown', title: 'Platform Breakdown', size: 'medium', position: 1 },
    { id: 'default_3', type: 'trend_chart', title: 'Visibility Trends', size: 'large', position: 2 },
    { id: 'default_4', type: 'recommendations', title: 'Top Recommendations', size: 'medium', position: 3 },
    { id: 'default_5', type: 'recent_audits', title: 'Recent Audits', size: 'medium', position: 4 },
];

const WIDGET_TEMPLATES: { type: WidgetType; title: string; icon: React.ReactNode; defaultSize: DashboardWidget['size'] }[] = [
    { type: 'visibility_score', title: 'Visibility Score', icon: <Target className="w-4 h-4" />, defaultSize: 'small' },
    { type: 'platform_breakdown', title: 'Platform Breakdown', icon: <BarChart3 className="w-4 h-4" />, defaultSize: 'medium' },
    { type: 'recommendations', title: 'Top Recommendations', icon: <Zap className="w-4 h-4" />, defaultSize: 'large' },
    { type: 'competitor_comparison', title: 'Competitor Comparison', icon: <Users className="w-4 h-4" />, defaultSize: 'medium' },
    { type: 'trend_chart', title: 'Visibility Trends', icon: <TrendingUp className="w-4 h-4" />, defaultSize: 'large' },
    { type: 'recent_audits', title: 'Recent Audits', icon: <LayoutGrid className="w-4 h-4" />, defaultSize: 'medium' },
];

const WidgetPreview: React.FC<{ type: WidgetType; size: DashboardWidget['size'] }> = ({ type }) => {
    switch (type) {
        case 'visibility_score':
            return (
                <div className="h-32 bg-background/50 rounded-lg flex items-center justify-center gap-4 px-4">
                    <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-border" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-primary" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset="24.3" strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">75</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                        <div className="font-bold text-white text-lg">75/100</div>
                        <div>Visibility Score</div>
                    </div>
                </div>
            );
        case 'platform_breakdown':
            return (
                <div className="h-32 bg-background/50 rounded-lg flex items-end justify-around px-4 pb-4 pt-6 gap-2">
                    {[
                        { name: 'GPT', pct: 72, color: 'bg-emerald-500' },
                        { name: 'Gemini', pct: 65, color: 'bg-blue-500' },
                        { name: 'Claude', pct: 58, color: 'bg-purple-500' },
                        { name: 'Perp.', pct: 81, color: 'bg-amber-500' },
                        { name: 'Google', pct: 68, color: 'bg-cyan-500' },
                        { name: 'Copilot', pct: 74, color: 'bg-indigo-500' },
                        { name: 'Meta', pct: 62, color: 'bg-pink-500' },
                        { name: 'Grok', pct: 70, color: 'bg-teal-500' },
                    ].map(p => (
                        <div key={p.name} className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-full bg-border rounded-t-sm overflow-hidden" style={{ height: 60 }}>
                                <div className={`${p.color} w-full rounded-t-sm`} style={{ height: `${p.pct}%`, marginTop: `${100 - p.pct}%` }} />
                            </div>
                            <span className="text-[9px] text-text-muted font-bold">{p.name}</span>
                        </div>
                    ))}
                </div>
            );
        case 'recommendations':
            return (
                <div className="h-32 bg-background/50 rounded-lg p-3 space-y-2 overflow-hidden">
                    {['Add structured data markup', 'Improve entity linking density', 'Optimize FAQ sections'].map((rec, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-rose-400' : i === 1 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                            <span className="text-text-secondary truncate">{rec}</span>
                            <span className={`ml-auto text-[9px] font-bold shrink-0 ${i === 0 ? 'text-rose-400' : i === 1 ? 'text-amber-400' : 'text-blue-400'}`}>
                                {i === 0 ? 'HIGH' : i === 1 ? 'MED' : 'LOW'}
                            </span>
                        </div>
                    ))}
                </div>
            );
        case 'competitor_comparison':
            return (
                <div className="h-32 bg-background/50 rounded-lg p-3 space-y-2 overflow-hidden">
                    {[
                        { name: 'Your Brand', score: 75, color: 'bg-primary' },
                        { name: 'Competitor A', score: 68, color: 'bg-rose-500' },
                        { name: 'Competitor B', score: 62, color: 'bg-rose-500/60' },
                    ].map(c => (
                        <div key={c.name} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-text-secondary">{c.name}</span>
                                <span className="text-text-muted font-bold">{c.score}</span>
                            </div>
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.score}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'trend_chart':
            return (
                <div className="h-32 bg-background/50 rounded-lg flex items-end px-3 pb-3 pt-6 gap-1">
                    {[45, 52, 48, 61, 58, 67, 72, 70, 75].map((v, i) => (
                        <div key={i} className="flex-1 bg-primary/30 rounded-t-sm relative" style={{ height: `${v}%` }}>
                            <div className="absolute inset-x-0 bottom-0 bg-primary rounded-t-sm" style={{ height: `${Math.min(100, v + 10)}%` }} />
                        </div>
                    ))}
                </div>
            );
        case 'recent_audits':
            return (
                <div className="h-32 bg-background/50 rounded-lg p-3 space-y-2 overflow-hidden">
                    {[
                        { domain: 'example.com', score: 82, date: '2d ago' },
                        { domain: 'blog.site.io', score: 67, date: '5d ago' },
                        { domain: 'docs.app.com', score: 91, date: '1w ago' },
                    ].map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-text-secondary">{a.domain}</span>
                            <div className="flex items-center gap-3">
                                <span className={`font-bold ${a.score >= 80 ? 'text-emerald-400' : a.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{a.score}</span>
                                <span className="text-text-muted text-[10px]">{a.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        default:
            return (
                <div className="h-32 bg-background/50 rounded-lg flex items-center justify-center text-text-muted text-sm">
                    Widget preview
                </div>
            );
    }
};

// Sortable widget card used inside the drag context
const SortableWidget: React.FC<{
    widget: DashboardWidget;
    isEditing: boolean;
    isDragging?: boolean;
    onRemove: (id: string) => void;
    onSizeChange: (id: string, size: DashboardWidget['size']) => void;
}> = ({ widget, isEditing, isDragging = false, onRemove, onSizeChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSelfDragging,
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSelfDragging ? 0 : 1,
    };

    const colSpanClass =
        widget.size === 'large'
            ? 'md:col-span-2 lg:col-span-3'
            : widget.size === 'medium'
            ? 'md:col-span-2 lg:col-span-2'
            : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${colSpanClass}`}
        >
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`
                    bg-surface border rounded-xl p-4 h-full
                    ${isEditing ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'}
                    ${isDragging ? 'shadow-2xl shadow-primary/20' : ''}
                `}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <button
                                className="text-text-muted hover:text-primary transition-colors cursor-grab active:cursor-grabbing touch-none"
                                {...attributes}
                                {...listeners}
                                aria-label="Drag to reorder"
                            >
                                <GripVertical className="w-4 h-4" />
                            </button>
                        )}
                        <span className="font-medium text-white">{widget.title}</span>
                    </div>
                    {isEditing && (
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                {(['small', 'medium', 'large'] as const).map(sz => (
                                    <button
                                        key={sz}
                                        onClick={() => onSizeChange(widget.id, sz)}
                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded capitalize transition-colors ${
                                            widget.size === sz
                                                ? 'bg-primary text-white'
                                                : 'bg-background text-text-secondary hover:text-white border border-border'
                                        }`}
                                    >
                                        {sz[0].toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => onRemove(widget.id)}
                                className="text-text-muted hover:text-rose-400 transition-colors"
                                aria-label="Remove widget"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <WidgetPreview type={widget.type} size={widget.size} />
            </motion.div>
        </div>
    );
};

// Ghost/overlay card shown while dragging
const DragOverlayCard: React.FC<{ widget: DashboardWidget }> = ({ widget }) => (
    <div className="bg-surface border border-primary/50 rounded-xl p-4 shadow-2xl shadow-primary/20 ring-2 ring-primary/30 rotate-2 opacity-90">
        <div className="flex items-center gap-2 mb-4">
            <GripVertical className="w-4 h-4 text-primary" />
            <span className="font-medium text-white">{widget.title}</span>
        </div>
        <WidgetPreview type={widget.type} size={widget.size} />
    </div>
);

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
    const [activeWidget, setActiveWidget] = useState<DashboardWidget | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    useEffect(() => {
        if (organization?.id) {
            loadDashboardConfig();
        }
    }, [organization?.id]);

    const loadDashboardConfig = async () => {
        if (!organization?.id) return;

        const { data } = await supabase
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
            console.error('Save dashboard failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefault = () => {
        setConfig(prev => ({
            ...prev,
            widgets: DEFAULT_WIDGETS.map((w, i) => ({ ...w, id: `widget_${Date.now()}_${i}` }))
        }));
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
            widgets: prev.widgets.filter(w => w.id !== widgetId).map((w, i) => ({ ...w, position: i }))
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

    const handleDragStart = (event: DragStartEvent) => {
        const widget = config.widgets.find(w => w.id === event.active.id);
        setActiveWidget(widget || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveWidget(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setConfig(prev => {
            const oldIndex = prev.widgets.findIndex(w => w.id === active.id);
            const newIndex = prev.widgets.findIndex(w => w.id === over.id);
            const reordered = arrayMove(prev.widgets, oldIndex, newIndex).map((w, i) => ({ ...w, position: i }));
            return { ...prev, widgets: reordered };
        });
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
                            {isEditing && <span className="ml-2 text-primary font-medium">· Editing mode</span>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleResetToDefault}
                                className="flex items-center gap-2 bg-background border border-border text-text-secondary hover:text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                title="Reset to default layout"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-text-secondary hover:text-white transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving…' : 'Save Layout'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 bg-surface border border-border hover:border-primary text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Customize
                        </button>
                    )}
                </div>
            </div>

            {/* Widget Palette (Edit Mode) */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="bg-surface border border-primary/30 rounded-xl p-4"
                    >
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
                                    <Plus className="w-3 h-3 text-text-muted" />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-text-muted mt-3">
                            Drag the <GripVertical className="inline w-3 h-3" /> handle to reorder widgets. Click S / M / L to resize.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drag-and-Drop Widget Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={config.widgets.map(w => w.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                            {config.widgets.map(widget => (
                                <SortableWidget
                                    key={widget.id}
                                    widget={widget}
                                    isEditing={isEditing}
                                    onRemove={removeWidget}
                                    onSizeChange={updateWidgetSize}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeWidget && <DragOverlayCard widget={activeWidget} />}
                </DragOverlay>
            </DndContext>

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
