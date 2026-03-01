import React, { useState } from 'react';
import { Building, ChevronDown, Plus, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceSwitcherProps {
    onCreateClick?: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ onCreateClick }) => {
    const { workspaces, currentWorkspace, switchWorkspace, organization } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);

    const handleSwitchWorkspace = async (workspaceId: string) => {
        if (workspaceId === currentWorkspace?.id) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            await switchWorkspace(workspaceId);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to switch workspace:', error);
        } finally {
            setSwitching(false);
        }
    };

    const handleCreateClick = () => {
        setIsOpen(false);
        onCreateClick?.();
    };

    if (!workspaces || workspaces.length === 0) {
        return null; // Don't show if no workspaces loaded
    }

    // Don't show switcher if only 1 workspace (most users)
    if (workspaces.length === 1 && !organization?.plan.includes('agency') && !organization?.plan.includes('enterprise')) {
        return null;
    }

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={switching}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface/80 transition-colors text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Building className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-medium truncate max-w-[120px] md:max-w-[150px]">
                    {switching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        currentWorkspace?.name || 'Select workspace'
                    )}
                </span>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown Content */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-border bg-background/50">
                                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                                    Workspaces
                                </p>
                                {organization?.plan && (
                                    <p className="text-[10px] text-text-muted mt-1">
                                        {workspaces.length} of {
                                            organization.plan === 'agency' || organization.plan === 'enterprise'
                                                ? '∞'
                                                : organization.plan === 'pro'
                                                    ? '3'
                                                    : '1'
                                        } used
                                    </p>
                                )}
                            </div>

                            {/* Workspace List */}
                            <div className="max-h-64 overflow-y-auto py-2">
                                {workspaces.map((workspace) => (
                                    <button
                                        key={workspace.id}
                                        onClick={() => handleSwitchWorkspace(workspace.id)}
                                        disabled={switching}
                                        className={`
                                            w-full text-left px-4 py-3 hover:bg-surface/80 transition-colors
                                            ${currentWorkspace?.id === workspace.id ? 'bg-primary/10' : ''}
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            flex items-center justify-between gap-3
                                        `}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Workspace Icon */}
                                            {workspace.icon_url ? (
                                                <img
                                                    src={workspace.icon_url}
                                                    alt={workspace.name}
                                                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-primary">
                                                        {workspace.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Workspace Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-white truncate">
                                                    {workspace.name}
                                                </div>
                                                {workspace.description && (
                                                    <div className="text-xs text-text-muted truncate">
                                                        {workspace.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active Indicator */}
                                        {currentWorkspace?.id === workspace.id && (
                                            <Check className="w-4 h-4 text-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Create New Workspace Button */}
                            {onCreateClick && (
                                <>
                                    <div className="border-t border-border" />
                                    <button
                                        onClick={handleCreateClick}
                                        className="w-full text-left px-4 py-3 hover:bg-surface/80 transition-colors flex items-center gap-3 text-sm text-primary font-medium"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                            <Plus className="w-4 h-4 text-primary" />
                                        </div>
                                        <span>Create new workspace</span>
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkspaceSwitcher;
