import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Building, Loader2, AlertCircle, Upload, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { createWorkspace, canCreateWorkspace } from '../services/workspaceService';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import { supabase } from '../services/supabase';
import { trapFocus } from '../utils/accessibility';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose }) => {
    const { organization, loadWorkspaces, switchWorkspace } = useAuth();
    const toast = useToast();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organization?.id) {
            setError('No organization found');
            return;
        }

        if (!name.trim()) {
            setError('Workspace name is required');
            return;
        }

        setCreating(true);
        setError(null);

        try {
            // Check if allowed to create workspace
            const { allowed, limit, current } = await canCreateWorkspace(
                organization.id,
                organization.plan || 'free'
            );

            if (!allowed) {
                setError(
                    `Your ${organization.plan || 'free'} plan is limited to ${limit} workspace${limit === 1 ? '' : 's'}. ` +
                    `Upgrade to Agency or Enterprise for unlimited workspaces.`
                );
                return;
            }

            // Upload icon to Supabase Storage if provided
            let iconUrl: string | undefined;
            if (iconFile) {
                const ext = iconFile.name.split('.').pop() || 'png';
                const path = `workspace-icons/${organization.id}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('public-assets')
                    .upload(path, iconFile, { upsert: true });
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(path);
                    iconUrl = urlData.publicUrl;
                }
            }

            // Create the workspace
            const workspace = await createWorkspace(
                organization.id,
                name.trim(),
                description.trim() || undefined,
                iconUrl
            );

            if (!workspace) {
                throw new Error('Failed to create workspace');
            }

            // Reload workspaces and switch to the new one
            await loadWorkspaces();
            await switchWorkspace(workspace.id);

            toast.success('Workspace created', `Successfully created "${workspace.name}"`);

            // Reset form and close modal
            setName('');
            setDescription('');
            setIconFile(null);
            setIconPreview(null);
            onClose();
        } catch (error: any) {
            console.error('Failed to create workspace:', getTechnicalErrorMessage(error));
            const userMsg = toUserMessage(error);
            setError(userMsg.message);
        } finally {
            setCreating(false);
        }
    };

    const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (PNG, JPG, SVG)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('Icon must be under 2 MB');
            return;
        }
        setIconFile(file);
        setIconPreview(URL.createObjectURL(file));
        setError(null);
    };

    const modalRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => {
        if (creating) return;
        setName('');
        setDescription('');
        setIconFile(null);
        setIconPreview(null);
        setError(null);
        onClose();
    }, [creating, onClose]);

    // Focus trap + Escape key
    useEffect(() => {
        if (!isOpen || !modalRef.current) return;
        const cleanup = trapFocus(modalRef.current);
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => { cleanup(); document.removeEventListener('keydown', handleEsc); };
    }, [isOpen, handleClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-workspace-title"
                        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Building className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 id="create-workspace-title" className="text-lg font-semibold text-text-primary">
                                        Create Workspace
                                    </h2>
                                    <p className="text-xs text-text-muted">
                                        Add a new brand or client workspace
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={creating}
                                className="p-2 hover:bg-surface/80 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Error Message */}
                            {error && (
                                <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-rose-400 font-medium">
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Workspace Name */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Workspace Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder="e.g., ACME Corp, Client XYZ"
                                    disabled={creating}
                                    maxLength={50}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    autoFocus
                                />
                                <p className="text-xs text-text-muted mt-1">
                                    {name.length}/50 characters
                                </p>
                            </div>

                            {/* Description (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Description <span className="text-text-muted text-xs">(optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., E-commerce brand in health & wellness"
                                    disabled={creating}
                                    maxLength={200}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
                                />
                                <p className="text-xs text-text-muted mt-1">
                                    {description.length}/200 characters
                                </p>
                            </div>

                            {/* Workspace Icon (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Icon <span className="text-text-muted text-xs">(optional)</span>
                                </label>
                                <input
                                    ref={iconInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                    onChange={handleIconSelect}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => iconInputRef.current?.click()}
                                        disabled={creating}
                                        className="w-14 h-14 rounded-xl border-2 border-dashed border-border hover:border-primary bg-background flex items-center justify-center transition-colors disabled:opacity-50 overflow-hidden shrink-0"
                                    >
                                        {iconPreview ? (
                                            <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-text-muted" />
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        {iconFile ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-text-primary truncate">{iconFile.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIconFile(null); setIconPreview(null); }}
                                                    className="text-text-muted hover:text-rose-400 transition-colors shrink-0"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => iconInputRef.current?.click()}
                                                disabled={creating}
                                                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                Upload image
                                            </button>
                                        )}
                                        <p className="text-[10px] text-text-muted mt-0.5">PNG, JPG, SVG — max 2 MB</p>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Limit Info */}
                            {organization?.plan && (
                                <div className="p-4 bg-background/50 border border-border rounded-lg">
                                    <p className="text-xs text-text-muted">
                                        Your <span className="font-bold text-primary capitalize">{organization.plan}</span> plan
                                        {organization.plan === 'agency' || organization.plan === 'enterprise' ? (
                                            ' includes unlimited workspaces'
                                        ) : organization.plan === 'pro' ? (
                                            ' includes up to 3 workspaces'
                                        ) : (
                                            ' includes 1 workspace'
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={creating}
                                    className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-text-primary font-medium hover:bg-surface transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !name.trim()}
                                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Workspace'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateWorkspaceModal;
