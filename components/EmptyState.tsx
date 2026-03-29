import React from 'react';
import { SearchX, FileQuestion, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: 'search' | 'file' | 'alert' | 'inbox' | 'custom';
    customIcon?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const iconComponents = {
    search: SearchX,
    file: FileQuestion,
    alert: AlertCircle,
    inbox: Inbox,
    custom: null,
};

/**
 * Reusable empty state component for when there's no data to display
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon = 'inbox',
    customIcon,
    action,
    className = '',
}) => {
    const IconComponent = iconComponents[icon];

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
            <div className="bg-surfaceHighlight p-4 rounded-2xl mb-4">
                {customIcon ? customIcon : IconComponent && <IconComponent className="w-10 h-10 text-slate-500" />}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    {action.label}
                </button>
            )}
        </div>
    );
};

/**
 * Specific empty states for common scenarios
 */
export const NoAuditsEmptyState: React.FC<{ onStartAudit?: () => void }> = ({ onStartAudit }) => (
    <EmptyState
        icon="search"
        title="No audits yet"
        description="Start your first AI visibility audit to see how search engines perceive your brand."
        action={onStartAudit ? { label: "Start First Audit", onClick: onStartAudit } : undefined}
    />
);

export const NoRecommendationsEmptyState: React.FC = () => (
    <EmptyState
        icon="file"
        title="No recommendations"
        description="Great news! We didn't find any critical issues with this page."
    />
);

export const NoTopicsEmptyState: React.FC = () => (
    <EmptyState
        icon="inbox"
        title="No topical authority detected"
        description="Add more content to establish your brand's expertise in specific topics."
    />
);

export const ErrorEmptyState: React.FC<{ onRetry?: () => void; message?: string }> = ({
    onRetry,
    message = "Something went wrong loading this data."
}) => (
    <EmptyState
        icon="alert"
        title="Error loading data"
        description={message}
        action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
    />
);
