export function safeHostname(input: string): string {
    if (!input) return '';

    try {
        const normalized = input.startsWith('http://') || input.startsWith('https://')
            ? input
            : `https://${input}`;
        return new URL(normalized).hostname.replace(/^www\./i, '');
    } catch {
        return input
            .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
            .split('/')[0]
            .trim();
    }
}

