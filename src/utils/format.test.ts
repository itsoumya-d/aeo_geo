import { describe, it, expect } from 'vitest';

export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

describe('Formatting Utilities', () => {
    it('formats numbers with commas', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('formats currency correctly', () => {
        expect(formatCurrency(49)).toBe('$49.00');
        expect(formatCurrency(199.99)).toBe('$199.99');
    });
});
