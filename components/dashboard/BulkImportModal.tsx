import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../../utils/errors';
import { trapFocus } from '../../utils/accessibility';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose }) => {
    const { organization } = useAuth();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [allUrls, setAllUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const parsedUrlCount = allUrls.length;

    const handleClose = useCallback(() => {
        if (uploading) return;
        onClose();
    }, [uploading, onClose]);

    useEffect(() => {
        if (!isOpen || !modalRef.current) return;
        const cleanup = trapFocus(modalRef.current);
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => { cleanup(); document.removeEventListener('keydown', handleEsc); };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const parseCSV = async (file: File) => {
        const text = await file.text();
        // Simple splitting by newline, handling basic cleanups
        const lines = text.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('domain') && !line.startsWith('url')); // Skip header if present

        // Basic URL validation
        const validUrls = lines.filter(url => {
            try {
                new URL(url.startsWith('http') ? url : `https://${url}`);
                return true;
            } catch {
                return false;
            }
        }).map(url => url.startsWith('http') ? url : `https://${url}`);

        if (validUrls.length === 0) {
            toast.error("Invalid CSV", "No valid URLs found in the file.");
            setFile(null);
            return;
        }

        setAllUrls(validUrls);
        setPreviewUrls(validUrls.slice(0, 10)); // Preview first 10
        setFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
                parseCSV(droppedFile);
            } else {
                toast.error('Invalid File', 'Please upload a CSV file.');
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            parseCSV(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file || !organization?.id) return;
        if (allUrls.length > 50) { // Limit for Sprint 1
            toast.warning("Limit Exceeded", "Bulk processing is currently limited to 50 domains per batch.");
            return;
        }

        setUploading(true);
        try {
            // Queue the job directly
            const { error } = await supabase
                .from('background_jobs')
                .insert({
                    organization_id: organization.id,
                    job_type: 'ANALYZE_BATCH',
                    status: 'PENDING',
                    payload: {
                        urls: allUrls,
                        organizationId: organization.id
                    }
                });

            if (error) throw error;

            toast.success("Batch Queued", `${allUrls.length} domains have been queued for analysis.`);
            onClose();
            setFile(null);
            setPreviewUrls([]);
            setAllUrls([]);
        } catch (error: any) {
            console.error('Bulk import failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="presentation">
            <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="bulk-import-title" className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
                    <h3 id="bulk-import-title" className="text-lg font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Bulk Domain Import
                    </h3>
                    <button onClick={handleClose} aria-label="Close bulk import dialog" className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="p-6">
                    {!file ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-700 bg-slate-900/50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-white font-medium mb-1">
                                Drag & drop your CSV here
                            </p>
                            <p className="text-sm text-slate-500 mb-6">
                                or click to browse
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleChange}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Select File
                            </button>
                            <p className="text-xs text-slate-500 mt-6">
                                Supported format: First column containing URLs. Max 50 rows.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <div className="p-3 bg-emerald-500/10 rounded-lg">
                                    <Check className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-slate-400">{previewUrls.length} domains detected</p>
                                </div>
                                <button
                                    onClick={() => { setFile(null); setPreviewUrls([]); }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="bg-slate-950 rounded-xl p-4 border border-white/5 max-h-40 overflow-y-auto">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Preview</p>
                                <ul className="space-y-2">
                                    {previewUrls.map((url, i) => (
                                        <li key={i} className="text-xs text-slate-300 font-mono truncate flex items-center gap-2">
                                            <span className="text-slate-600">{i + 1}.</span> {url}
                                        </li>
                                    ))}
                                    {previewUrls.length < parsedUrlCount && (
                                        <li className="text-xs text-slate-600 italic">...and {parsedUrlCount - previewUrls.length} more</li>
                                    )}
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={uploading}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Batch Analysis'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
