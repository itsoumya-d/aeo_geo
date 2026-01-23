import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

/**
 * Hook for handling keyboard shortcuts throughout the app
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 'n', ctrl: true, action: () => startNewAudit(), description: 'New Audit' },
 *   { key: 'h', ctrl: true, action: () => goToHistory(), description: 'Go to History' },
 * ]);
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement
        ) {
            return;
        }

        for (const shortcut of shortcuts) {
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            const altMatch = shortcut.alt ? event.altKey : !event.altKey;
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

            if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                event.preventDefault();
                shortcut.action();
                return;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

/**
 * Common app-wide keyboard shortcuts
 */
export const APP_SHORTCUTS = {
    NEW_AUDIT: { key: 'n', ctrl: true, description: 'Start New Audit' },
    GO_HOME: { key: 'h', ctrl: true, description: 'Go to Home' },
    GO_SETTINGS: { key: ',', ctrl: true, description: 'Open Settings' },
    GO_HISTORY: { key: 'y', ctrl: true, description: 'View History' },
    SEARCH: { key: 'k', ctrl: true, description: 'Search' },
    HELP: { key: '/', description: 'Show Keyboard Shortcuts' },
};

/**
 * Get formatted shortcut text for display
 */
export const formatShortcut = (shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }): string => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
    if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
    if (shortcut.shift) parts.push('⇧');
    parts.push(shortcut.key.toUpperCase());

    return parts.join(isMac ? '' : '+');
};
