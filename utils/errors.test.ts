import { describe, it, expect } from 'vitest';
import {
    toUserMessage,
    getTechnicalErrorMessage,
    generateErrorId,
} from './errors';

describe('toUserMessage', () => {
    it('maps network errors to Connection Lost', () => {
        const result = toUserMessage(new Error('network request failed'));
        expect(result.title).toBe('Connection Lost');
        expect(result.isRateLimit).toBeUndefined();
    });

    it('maps fetch timeout to Connection Lost', () => {
        const result = toUserMessage(new Error('fetch timeout ERR_NETWORK'));
        expect(result.title).toBe('Connection Lost');
    });

    it('maps 401 errors to Session Expired', () => {
        const result = toUserMessage(new Error('401 unauthorized'));
        expect(result.title).toBe('Session Expired');
    });

    it('maps unauthenticated string to Session Expired', () => {
        const result = toUserMessage('unauthenticated');
        expect(result.title).toBe('Session Expired');
    });

    it('maps 403 forbidden to Access Restricted', () => {
        const result = toUserMessage(new Error('403 forbidden'));
        expect(result.title).toBe('Access Restricted');
    });

    it('maps 404 not found to Page Not Found', () => {
        const result = toUserMessage(new Error('404 not found'));
        expect(result.title).toBe('Page Not Found');
    });

    it('maps 429 rate limit to Limit Reached and sets isRateLimit flag', () => {
        const result = toUserMessage(new Error('429 rate limit exceeded'));
        expect(result.title).toBe('Limit Reached');
        expect(result.isRateLimit).toBe(true);
    });

    it('maps too many requests to Limit Reached', () => {
        const result = toUserMessage(new Error('too many requests'));
        expect(result.title).toBe('Limit Reached');
        expect(result.isRateLimit).toBe(true);
    });

    it('maps 500 internal server error to Something Went Wrong', () => {
        const result = toUserMessage(new Error('500 internal server error'));
        expect(result.title).toBe('Something Went Wrong');
    });

    it('maps stripe billing errors to Payment Issue', () => {
        const result = toUserMessage(new Error('stripe checkout failed'));
        expect(result.title).toBe('Payment Issue');
    });

    it('maps crawl errors to Analysis Paused', () => {
        const result = toUserMessage(new Error('crawl failed: site blocked'));
        expect(result.title).toBe('Analysis Paused');
    });

    it('maps invalid URL errors to Invalid Link', () => {
        const result = toUserMessage(new Error('invalid url provided'));
        expect(result.title).toBe('Invalid Link');
    });

    it('returns default for unrecognized errors', () => {
        const result = toUserMessage(new Error('xyzzy unknown'));
        expect(result.title).toBe('Something Went Wrong');
        expect(result.message).toContain('unexpected error');
    });

    it('preserves originalError reference', () => {
        const err = new Error('network failure');
        const result = toUserMessage(err);
        expect(result.originalError).toBe(err);
    });

    it('handles plain string errors', () => {
        const result = toUserMessage('401 unauthorized');
        expect(result.title).toBe('Session Expired');
    });

    it('handles object errors with message property', () => {
        const result = toUserMessage({ message: '429 rate_limit' });
        expect(result.title).toBe('Limit Reached');
    });

    it('handles null/undefined gracefully', () => {
        const result = toUserMessage(null);
        expect(result.title).toBe('Something Went Wrong');
    });
});

describe('getTechnicalErrorMessage', () => {
    it('returns stack trace for Error instances', () => {
        const err = new Error('test error');
        const msg = getTechnicalErrorMessage(err);
        expect(msg).toContain('test error');
    });

    it('returns string directly for string errors', () => {
        expect(getTechnicalErrorMessage('direct string error')).toBe('direct string error');
    });

    it('extracts message from object', () => {
        expect(getTechnicalErrorMessage({ message: 'obj error' })).toBe('obj error');
    });

    it('JSON-stringifies unknown objects', () => {
        const result = getTechnicalErrorMessage({ code: 42, reason: 'test' });
        expect(result).toContain('"code":42');
    });

    it('handles primitives', () => {
        expect(getTechnicalErrorMessage(42)).toBe('42');
    });
});

describe('generateErrorId', () => {
    it('returns an uppercase ERR- prefixed string', () => {
        const id = generateErrorId();
        expect(id).toMatch(/^ERR-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('returns unique IDs each call', () => {
        const ids = new Set(Array.from({ length: 50 }, () => generateErrorId()));
        expect(ids.size).toBe(50);
    });
});
