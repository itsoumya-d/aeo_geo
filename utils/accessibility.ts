/**
 * Accessibility utilities for improving WCAG compliance
 */

/**
 * Generate unique IDs for accessibility attributes
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
    return `${prefix}-${++idCounter}`;
}

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Trap focus within a modal/dialog
 */
export function trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleTabKey);
}

/**
 * Manage focus when navigating between views
 */
export function moveFocusTo(selector: string): void {
    requestAnimationFrame(() => {
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
            element.focus();
            // Optionally scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate animation duration based on user preference
 */
export function getAnimationDuration(normalDuration: number): number {
    return prefersReducedMotion() ? 0 : normalDuration;
}

/**
 * Semantic heading level manager for proper hierarchy
 */
class HeadingLevelManager {
    private stack: number[] = [1];

    push(): number {
        const current = this.stack[this.stack.length - 1];
        const next = Math.min(current + 1, 6);
        this.stack.push(next);
        return next;
    }

    pop(): void {
        if (this.stack.length > 1) {
            this.stack.pop();
        }
    }

    current(): number {
        return this.stack[this.stack.length - 1];
    }

    reset(): void {
        this.stack = [1];
    }
}

export const headingLevel = new HeadingLevelManager();

/**
 * Check color contrast ratio
 * Returns ratio >= 4.5 for AA compliance (normal text)
 * Returns ratio >= 3 for AA compliance (large text)
 */
export function getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = ((rgb >> 16) & 0xff) / 255;
        const g = ((rgb >> 8) & 0xff) / 255;
        const b = (rgb & 0xff) / 255;

        const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Visually hidden styles for screen reader only content
 */
export const srOnlyStyles = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
} as const;
