/**
 * URL validation and normalization utilities
 */

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Normalize the URL first
    const normalized = normalizeUrl(url);

    try {
        const parsed = new URL(normalized);
        // Must be http or https
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Normalizes a URL by adding protocol if missing
 */
export function normalizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
        return '';
    }

    let normalized = url.trim();

    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
    }

    // Remove trailing slash for consistency
    normalized = normalized.replace(/\/$/, '');

    return normalized;
}

/**
 * Extracts the domain from a URL
 */
export function extractDomain(url: string): string {
    try {
        const normalized = normalizeUrl(url);
        const parsed = new URL(normalized);
        return parsed.hostname;
    } catch {
        return '';
    }
}

/**
 * Extracts the root domain (without subdomain) from a URL
 */
export function extractRootDomain(url: string): string {
    const domain = extractDomain(url);
    if (!domain) return '';

    const parts = domain.split('.');

    // Handle cases like co.uk, com.au
    const twoPartTLDs = ['co.uk', 'com.au', 'co.nz', 'com.br', 'co.jp', 'co.in', 'org.uk', 'com.sg', 'co.za', 'com.mx', 'co.kr', 'com.cn', 'com.tw', 'com.hk', 'co.id', 'com.my', 'co.th', 'com.ph', 'com.vn', 'com.ar', 'com.co', 'com.pe', 'co.il', 'com.tr', 'com.ua', 'org.au', 'net.au', 'gov.uk', 'ac.uk'];
    const lastTwo = parts.slice(-2).join('.');

    if (twoPartTLDs.includes(lastTwo) && parts.length > 2) {
        return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
}

/**
 * Checks if two URLs are from the same domain
 */
export function isSameDomain(url1: string, url2: string): boolean {
    return extractDomain(url1) === extractDomain(url2);
}

/**
 * Extracts a clean hostname from a URL, stripping www prefix.
 * Handles malformed input gracefully with a regex fallback.
 */
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

/**
 * Validates URL and returns error message if invalid
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { isValid: false, error: 'URL is required' };
    }

    const normalized = normalizeUrl(url);

    try {
        const parsed = new URL(normalized);

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { isValid: false, error: 'URL must use http or https' };
        }

        // Check for valid hostname
        if (!parsed.hostname || parsed.hostname.length < 3) {
            return { isValid: false, error: 'Invalid domain name' };
        }

        // Must have a TLD (at least one dot)
        if (!parsed.hostname.includes('.')) {
            return { isValid: false, error: 'Domain must include a TLD (e.g., .com)' };
        }

        // Check for localhost/IP in production
        if (parsed.hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
            return { isValid: false, error: 'Local URLs are not supported' };
        }

        return { isValid: true };
    } catch {
        return { isValid: false, error: 'Invalid URL format' };
    }
}

/**
 * Checks if a URL is a duplicate in an array
 */
export function isDuplicateUrl(url: string, existingUrls: string[]): boolean {
    const normalizedNew = normalizeUrl(url);
    return existingUrls.some(existing => normalizeUrl(existing) === normalizedNew);
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email || !email.trim()) {
        return { isValid: false, error: 'Email is required' };
    }

    const normalized = email.trim().toLowerCase();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!re.test(normalized)) {
        return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
}
