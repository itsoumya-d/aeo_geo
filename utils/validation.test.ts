import { describe, it, expect } from 'vitest';
import {
    isValidUrl,
    normalizeUrl,
    extractDomain,
    extractRootDomain,
    isSameDomain,
    validateUrl,
    isDuplicateUrl
} from './validation';

describe('URL Validation Utilities', () => {

    describe('normalizeUrl', () => {
        it('adds https:// to bare domain', () => {
            expect(normalizeUrl('example.com')).toBe('https://example.com');
        });

        it('adds https:// to www. prefix', () => {
            expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
        });

        it('removes trailing slash', () => {
            expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
        });

        it('trims whitespace', () => {
            expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
        });

        it('preserves http:// protocol', () => {
            expect(normalizeUrl('http://example.com')).toBe('http://example.com');
        });

        it('returns empty string for empty input', () => {
            expect(normalizeUrl('')).toBe('');
        });

        it('handles null/undefined gracefully', () => {
            expect(normalizeUrl(null as any)).toBe('');
            expect(normalizeUrl(undefined as any)).toBe('');
        });
    });

    describe('isValidUrl', () => {
        it('returns true for valid https URL', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
        });

        it('returns true for valid http URL', () => {
            expect(isValidUrl('http://example.com')).toBe(true);
        });

        it('returns true for bare domain (normalized)', () => {
            expect(isValidUrl('example.com')).toBe(true);
        });

        it('returns false for empty string', () => {
            expect(isValidUrl('')).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isValidUrl(null as any)).toBe(false);
            expect(isValidUrl(undefined as any)).toBe(false);
        });
    });

    describe('extractDomain', () => {
        it('extracts domain from full URL', () => {
            expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
        });

        it('extracts domain from bare URL', () => {
            expect(extractDomain('example.com')).toBe('example.com');
        });

        it('handles subdomain correctly', () => {
            expect(extractDomain('https://blog.example.com')).toBe('blog.example.com');
        });

        it('returns empty string for invalid URL', () => {
            expect(extractDomain('')).toBe('');
        });
    });

    describe('extractRootDomain', () => {
        it('removes www subdomain', () => {
            expect(extractRootDomain('https://www.example.com')).toBe('example.com');
        });

        it('removes other subdomains', () => {
            expect(extractRootDomain('https://blog.example.com')).toBe('example.com');
        });

        it('handles two-part TLDs like co.uk', () => {
            expect(extractRootDomain('https://www.example.co.uk')).toBe('example.co.uk');
        });

        it('handles com.au TLD', () => {
            expect(extractRootDomain('https://shop.example.com.au')).toBe('example.com.au');
        });
    });

    describe('isSameDomain', () => {
        it('returns true for same domain', () => {
            expect(isSameDomain('https://example.com/a', 'https://example.com/b')).toBe(true);
        });

        it('returns false for different domains', () => {
            expect(isSameDomain('https://example.com', 'https://other.com')).toBe(false);
        });

        it('returns true when normalizing with/without www', () => {
            expect(isSameDomain('example.com', 'example.com/page')).toBe(true);
        });
    });

    describe('validateUrl', () => {
        it('returns valid for proper URL', () => {
            const result = validateUrl('https://example.com');
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('returns error for empty URL', () => {
            const result = validateUrl('');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('URL is required');
        });

        it('returns error for localhost', () => {
            // localhost:3000 fails TLD check first
            const result = validateUrl('http://localhost:3000');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Domain must include a TLD (e.g., .com)');
        });

        it('returns error for IP addresses', () => {
            const result = validateUrl('http://192.168.1.1');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Local URLs are not supported');
        });

        it('returns error for domain without TLD', () => {
            const result = validateUrl('example');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Domain must include a TLD (e.g., .com)');
        });
    });

    describe('isDuplicateUrl', () => {
        const existingUrls = ['https://example.com', 'https://test.com'];

        it('detects exact duplicate', () => {
            expect(isDuplicateUrl('https://example.com', existingUrls)).toBe(true);
        });

        it('detects duplicate with different protocol format', () => {
            expect(isDuplicateUrl('example.com', existingUrls)).toBe(true);
        });

        it('returns false for non-duplicate', () => {
            expect(isDuplicateUrl('https://new-site.com', existingUrls)).toBe(false);
        });

        it('detects duplicate with trailing slash difference', () => {
            expect(isDuplicateUrl('https://example.com/', existingUrls)).toBe(true);
        });
    });
});
