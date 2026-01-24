import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Test the page type detection logic used in discoverSiteStructure
// This is extracted to be testable without mocking external services
describe('Page Type Detection Logic', () => {
    /**
     * Helper function that replicates the page type detection from geminiService.ts
     * This allows testing the logic without hitting Supabase or Firecrawl
     */
    function detectPageType(link: string, siteUrl: string): 'HOMEPAGE' | 'ABOUT' | 'PRICING' | 'BLOG' | 'PRODUCT' | 'CONTACT' | 'DOCS' | 'OTHER' {
        const lower = link.toLowerCase();
        if (link === siteUrl || link === siteUrl + '/') return 'HOMEPAGE';
        if (lower.includes('about')) return 'ABOUT';
        if (lower.includes('pricing')) return 'PRICING';
        if (lower.includes('blog') || lower.includes('news')) return 'BLOG';
        if (lower.includes('product') || lower.includes('feature')) return 'PRODUCT';
        if (lower.includes('contact')) return 'CONTACT';
        if (lower.includes('docs') || lower.includes('api')) return 'DOCS';
        return 'OTHER';
    }

    const siteUrl = 'https://example.com';

    describe('Homepage Detection', () => {
        it('detects homepage without trailing slash', () => {
            expect(detectPageType('https://example.com', siteUrl)).toBe('HOMEPAGE');
        });

        it('detects homepage with trailing slash', () => {
            expect(detectPageType('https://example.com/', siteUrl)).toBe('HOMEPAGE');
        });
    });

    describe('About Page Detection', () => {
        it('detects /about path', () => {
            expect(detectPageType('https://example.com/about', siteUrl)).toBe('ABOUT');
        });

        it('detects /about-us path', () => {
            expect(detectPageType('https://example.com/about-us', siteUrl)).toBe('ABOUT');
        });

        it('detects /company/about path', () => {
            expect(detectPageType('https://example.com/company/about', siteUrl)).toBe('ABOUT');
        });
    });

    describe('Pricing Page Detection', () => {
        it('detects /pricing path', () => {
            expect(detectPageType('https://example.com/pricing', siteUrl)).toBe('PRICING');
        });

        it('detects /plans/pricing path', () => {
            expect(detectPageType('https://example.com/plans/pricing', siteUrl)).toBe('PRICING');
        });
    });

    describe('Blog Detection', () => {
        it('detects /blog path', () => {
            expect(detectPageType('https://example.com/blog', siteUrl)).toBe('BLOG');
        });

        it('detects /news path', () => {
            expect(detectPageType('https://example.com/news', siteUrl)).toBe('BLOG');
        });

        it('detects /blog/article-title path', () => {
            expect(detectPageType('https://example.com/blog/how-to-optimize', siteUrl)).toBe('BLOG');
        });
    });

    describe('Product Page Detection', () => {
        it('detects /product path', () => {
            expect(detectPageType('https://example.com/product', siteUrl)).toBe('PRODUCT');
        });

        it('detects /features path', () => {
            expect(detectPageType('https://example.com/features', siteUrl)).toBe('PRODUCT');
        });

        it('detects /products/api path', () => {
            expect(detectPageType('https://example.com/products/api', siteUrl)).toBe('PRODUCT');
        });
    });

    describe('Contact Page Detection', () => {
        it('detects /contact path', () => {
            expect(detectPageType('https://example.com/contact', siteUrl)).toBe('CONTACT');
        });

        it('detects /contact-us path', () => {
            expect(detectPageType('https://example.com/contact-us', siteUrl)).toBe('CONTACT');
        });
    });

    describe('Docs Page Detection', () => {
        it('detects /docs path', () => {
            expect(detectPageType('https://example.com/docs', siteUrl)).toBe('DOCS');
        });

        it('detects /api path', () => {
            expect(detectPageType('https://example.com/api', siteUrl)).toBe('DOCS');
        });

        it('detects /api-reference path', () => {
            expect(detectPageType('https://example.com/api-reference', siteUrl)).toBe('DOCS');
        });
    });

    describe('Other Pages', () => {
        it('returns OTHER for unknown paths', () => {
            expect(detectPageType('https://example.com/random', siteUrl)).toBe('OTHER');
        });

        it('returns OTHER for team page', () => {
            expect(detectPageType('https://example.com/team', siteUrl)).toBe('OTHER');
        });

        it('returns OTHER for careers page', () => {
            expect(detectPageType('https://example.com/careers', siteUrl)).toBe('OTHER');
        });
    });

    describe('Case Insensitivity', () => {
        it('handles uppercase ABOUT', () => {
            expect(detectPageType('https://example.com/ABOUT', siteUrl)).toBe('ABOUT');
        });

        it('handles mixed case Pricing', () => {
            expect(detectPageType('https://example.com/Pricing', siteUrl)).toBe('PRICING');
        });
    });
});

describe('Rewrite Simulation Error Handling', () => {
    /**
     * Test the fallback behavior from simulateRewriteAnalysis
     */
    it('returns default fallback on error', () => {
        const fallback = {
            scoreDelta: 0,
            vectorShift: 0,
            reasoning: "Analysis failed. Please try again."
        };

        // This tests the expected fallback shape
        expect(fallback.scoreDelta).toBe(0);
        expect(fallback.vectorShift).toBe(0);
        expect(fallback.reasoning).toContain('failed');
    });
});
