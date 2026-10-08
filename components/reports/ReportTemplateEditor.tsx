import React, { useRef, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type LucideIcon, FileText, BarChart, TrendingUp, Users, List, GripVertical, Plus, Save, ArrowLeft, X, Monitor, Download, Upload } from 'lucide-react';
import { parseReportTemplate, validateReportTemplate, templateFileName, MAX_TEMPLATE_BYTES, MAX_TEMPLATE_SECTIONS, type ReportTemplate } from '../../utils/reportTemplate';

interface ReportSection {
    id: string;
    type: ReportTemplate['layout'][number]['type'];
    title: string;
    icon: LucideIcon;
}

const AVAILABLE_SECTIONS: ReportSection[] = [
    { id: 'summary', type: 'summary', title: 'Executive Summary', icon: FileText },
    { id: 'score', type: 'score', title: 'Score Overview', icon: BarChart },
    { id: 'trends', type: 'trends', title: 'Visibility Trends', icon: TrendingUp },
    { id: 'competitors', type: 'competitors', title: 'Competitor Analysis', icon: Users },
    { id: 'recommendations', type: 'recommendations', title: 'Key Recommendations', icon: List },
];

function SortableItem(props: { id: string, section: ReportSection, disabled: boolean, onRemove: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id, disabled: props.disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div role="listitem" ref={setNodeRef} style={style} className="bg-slate-900 border border-white/10 rounded-xl p-4 mb-3 flex items-center justify-between group hover:border-primary/50 transition-colors">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                <button type="button" aria-label={`Move ${props.section.title}`} disabled={props.disabled} {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white">
                    <GripVertical className="w-5 h-5" />
                </button>
                <div className="shrink-0 p-2 bg-primary/10 rounded-lg text-primary">
                    <props.section.icon className="w-5 h-5" />
                </div>
                <span className="min-w-0 break-words text-white font-medium">{props.section.title}</span>
            </div>
            <button
                onClick={() => props.onRemove(props.id)}
                aria-label={`Remove ${props.section.title}`}
                disabled={props.disabled}
                className="shrink-0 p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 opacity-70 group-hover:opacity-100 focus:opacity-100 transition-all"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

interface ReportTemplateEditorProps {
    onSave: (template: ReportTemplate) => Promise<void>;
    onBack: () => void;
}

export const ReportTemplateEditor: React.FC<ReportTemplateEditorProps> = ({ onSave, onBack }) => {
    const [name, setName] = useState("My Custom Report");
    const [sections, setSections] = useState<ReportSection[]>([
        AVAILABLE_SECTIONS[0], AVAILABLE_SECTIONS[1], AVAILABLE_SECTIONS[4]
    ]);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const pending = useRef(false);
    const nextId = useRef(0);
    const fileInput = useRef<HTMLInputElement>(null);
    const busy = isSaving || isImporting;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && !pending.current) {
            setStatus('');
            setSections((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over?.id);
                return oldIndex < 0 || newIndex < 0 ? items : arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addSection = (section: ReportSection) => {
        if (pending.current) return;
        const newId = `${section.type}-added-${nextId.current++}`;
        setSections(items => items.length < MAX_TEMPLATE_SECTIONS ? [...items, { ...section, id: newId }] : items);
        setStatus('');
    };

    const removeSection = (id: string) => {
        if (pending.current) return;
        setSections(items => items.filter(s => s.id !== id));
        setStatus('');
    };

    const getTemplate = () => validateReportTemplate({
        format: 'cognition-report-template', version: 1, name,
        layout: sections.map(({ type, title }) => ({ type, title }))
    });

    const handleSave = async () => {
        if (pending.current) return;
        setError('');
        setStatus('');
        let template: ReportTemplate;
        try { template = getTemplate(); }
        catch (err) { setError((err as Error).message); return; }
        pending.current = true;
        setIsSaving(true);
        try {
            await onSave(template);
            setStatus('Template saved.');
        } catch {
            setError('Could not save the template. Your changes are still here. Try again or export a backup.');
        } finally {
            pending.current = false;
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        if (pending.current) return;
        setError('');
        setStatus('');
        try {
            const template = getTemplate();
            const url = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2) + '\n'], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = templateFileName(template.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setStatus('Template exported. Import the JSON file to restore this layout.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not export the template.');
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || pending.current) return;
        pending.current = true;
        setIsImporting(true);
        setError('');
        setStatus('');
        try {
            if (file.size > MAX_TEMPLATE_BYTES) throw new Error('Choose a template JSON file smaller than 64 KB.');
            const template = parseReportTemplate(await file.text());
            setName(template.name);
            setSections(template.layout.map(section => ({
                ...section, id: `imported-${nextId.current++}`,
                icon: AVAILABLE_SECTIONS.find(available => available.type === section.type)!.icon
            })));
            setStatus('Template imported. Review the layout, then save or export it.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not read the file. Your current layout is unchanged.');
        } finally {
            pending.current = false;
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface p-4 lg:p-8 font-sans">
            {/* Mobile Warning */}
            <div className="lg:hidden mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <Monitor className="w-5 h-5 text-amber-700 shrink-0" />
                <p className="text-xs text-amber-900">Report Builder works best on desktop. Some features may be limited on smaller screens.</p>
            </div>
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} disabled={busy} aria-label="Back" className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-text-primary transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary font-display">Report Builder</h1>
                        <p className="text-slate-500 text-sm">Design your white-labeled client reports</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 max-w-full">
                    <input
                        type="text"
                        aria-label="Template name"
                        maxLength={120}
                        disabled={busy}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setStatus(''); }}
                        className="bg-transparent border-b border-border text-text-primary px-2 py-1 min-w-0 w-full sm:w-48 outline-none focus:border-primary"
                        placeholder="Template Name"
                    />
                    <button onClick={handleExport} disabled={busy} className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm text-text-primary">
                        <Download className="w-4 h-4" /> Export JSON
                    </button>
                    <button onClick={() => fileInput.current?.click()} disabled={busy} className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm text-text-primary">
                        <Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import JSON'}
                    </button>
                    <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Import template JSON" className="hidden" onChange={handleImport} disabled={busy} />
                    <button
                        onClick={handleSave}
                        disabled={busy}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto mb-6 text-sm">
                <p className="text-text-secondary">Export a portable layout backup. Import replaces this unsaved layout; export first to keep it. Files contain the name and sections, not audit data.</p>
                {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
                {status && <p role="status" className="mt-3 text-emerald-700">{status}</p>}
            </div>
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Available Modules */}
                <div className="col-span-1 space-y-4">
                    <h3 className="text-text-muted text-xs font-bold uppercase tracking-widest mb-4">Available Modules</h3>
                    {AVAILABLE_SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => addSection(section)}
                            aria-label={`Add ${section.title}`}
                            disabled={busy || sections.length >= MAX_TEMPLATE_SECTIONS}
                            className="w-full flex items-center gap-3 bg-blue-50 border border-white/5 hover:border-white/20 p-4 rounded-xl text-left transition-all group"
                        >
                            <div className="p-2 bg-white/5 rounded-lg text-text-muted group-hover:text-primary group-hover:bg-white/10 transition-colors">
                                <section.icon className="w-4 h-4" />
                            </div>
                            <span className="text-text-secondary group-hover:text-text-primary text-sm font-medium">{section.title}</span>
                            <Plus className="w-4 h-4 text-slate-500 ml-auto opacity-70 group-hover:opacity-100 focus:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>

                {/* Canvas */}
                <div className="lg:col-span-2 bg-slate-950 border border-white/10 rounded-2xl p-4 lg:p-8 min-h-[400px] lg:min-h-[600px] shadow-2xl">
                    <div className="mb-8 p-6 bg-white rounded-lg shadow-sm">
                        <div className="flex justify-between items-center opacity-50">
                            <div className="w-32 h-8 bg-slate-200 rounded"></div>
                            <div className="w-24 h-24 bg-slate-100 rounded-full"></div>
                        </div>
                    </div>

                    <div role="list" aria-label="Report sections">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sections.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sections.map((section) => (
                                <SortableItem key={section.id} id={section.id} section={section} disabled={busy} onRemove={removeSection} />
                            ))}
                        </SortableContext>
                    </DndContext>
                    </div>

                    {sections.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-slate-500">Click an available module to add it here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
