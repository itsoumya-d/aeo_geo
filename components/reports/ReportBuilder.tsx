import React, { useState, useEffect } from 'react';
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
import { motion } from 'framer-motion';
import { FileText, BarChart, TrendingUp, Users, List, GripVertical, Plus, Save, ArrowLeft, X, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { useAuth } from '../../contexts/AuthContext';
import { getTechnicalErrorMessage, toUserMessage } from '../../utils/errors';

interface ReportSection {
    id: string;
    type: 'summary' | 'score' | 'trends' | 'competitors' | 'recommendations';
    title: string;
    icon: any;
}

const AVAILABLE_SECTIONS: ReportSection[] = [
    { id: 'summary', type: 'summary', title: 'Executive Summary', icon: FileText },
    { id: 'score', type: 'score', title: 'Score Overview', icon: BarChart },
    { id: 'trends', type: 'trends', title: 'Visibility Trends', icon: TrendingUp },
    { id: 'competitors', type: 'competitors', title: 'Competitor Analysis', icon: Users },
    { id: 'recommendations', type: 'recommendations', title: 'Key Recommendations', icon: List },
];

function SortableItem(props: { id: string, section: ReportSection, onRemove: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-3 flex items-center justify-between group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white">
                    <GripVertical className="w-5 h-5" />
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <props.section.icon className="w-5 h-5" />
                </div>
                <span className="text-white font-medium">{props.section.title}</span>
            </div>
            <button
                onClick={() => props.onRemove(props.id)}
                className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export const ReportBuilder: React.FC = () => {
    const { organization } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [name, setName] = useState("My Custom Report");
    const [sections, setSections] = useState<ReportSection[]>([
        AVAILABLE_SECTIONS[0],
        AVAILABLE_SECTIONS[1],
        AVAILABLE_SECTIONS[4]
    ]);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setSections((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addSection = (section: ReportSection) => {
        const newId = `${section.type}-${Date.now()}`;
        setSections([...sections, { ...section, id: newId }]);
    };

    const removeSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const handleSave = async () => {
        if (!organization) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('report_templates')
                .insert({
                    organization_id: organization.id,
                    name,
                    layout: sections.map(s => ({ type: s.type, title: s.title })),
                    is_default: false
                });

            if (error) throw error;
            toast.success("Template Saved", "Your custom report layout has been created.");
            navigate('/settings'); // Or back to list
        } catch (error: any) {
            console.error('Save report template failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
        setIsSaving(false);
    };

    return (
        <div className="min-h-screen bg-[#020617] p-4 lg:p-8 font-inter">
            {/* Mobile Warning */}
            <div className="lg:hidden mb-6 bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                <Monitor className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-200/80">Report Builder works best on desktop. Some features may be limited on smaller screens.</p>
            </div>
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Report Builder</h1>
                        <p className="text-slate-500 text-sm">Design your white-labeled client reports</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-transparent border-b border-white/20 text-white px-2 py-1 outline-none focus:border-primary"
                        placeholder="Template Name"
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Available Modules */}
                <div className="col-span-1 space-y-4">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Available Modules</h3>
                    {AVAILABLE_SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => addSection(section)}
                            className="w-full flex items-center gap-3 bg-slate-900/30 border border-white/5 hover:border-white/20 p-4 rounded-xl text-left transition-all group"
                        >
                            <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
                                <section.icon className="w-4 h-4" />
                            </div>
                            <span className="text-slate-300 group-hover:text-white text-sm font-medium">{section.title}</span>
                            <Plus className="w-4 h-4 text-slate-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                <SortableItem key={section.id} id={section.id} section={section} onRemove={removeSection} />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {sections.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-slate-500">Drag or click items on the left to add them here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
