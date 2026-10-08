import { describe, expect, it } from 'vitest';
import { MAX_TEMPLATE_BYTES, parseReportTemplate, templateFileName, validateReportTemplate } from './reportTemplate';

const valid = () => ({
    format: 'cognition-report-template', version: 1, name: 'Client report',
    layout: [{ type: 'score', title: 'Score Overview' }, { type: 'summary', title: 'Executive Summary' }],
});

describe('report template portability', () => {
    it('round-trips the ordered layout including repeated section types and Unicode', () => {
        const template = valid();
        template.name = 'Māori report 📋';
        template.layout.push(template.layout[0]);
        expect(parseReportTemplate(JSON.stringify(template))).toEqual(template);
    });

    it('only retains portable data, excluding organization and row metadata', () => {
        const template = valid();
        expect(validateReportTemplate({ ...template, organization_id: 'private', id: 'row-id', layout: template.layout.map(s => ({ ...s, id: 'section-id' })) })).toEqual(template);
    });

    it('normalizes surrounding whitespace', () => {
        expect(validateReportTemplate({ ...valid(), name: '  Client report  ' }).name).toBe('Client report');
    });

    it.each([null, [], {}, { ...valid(), version: 2 }, { ...valid(), format: 'other' }])('rejects unsupported documents: %j', value => {
        expect(() => validateReportTemplate(value)).toThrow('supported Cognition');
    });

    it.each(['', '  ', 'x'.repeat(121), 42])('rejects invalid names: %j', name => {
        expect(() => validateReportTemplate({ ...valid(), name })).toThrow('Template name');
    });

    it.each([[], null, Array.from({ length: 51 }, () => valid().layout[0])])('rejects empty, missing or excessive layouts', layout => {
        expect(() => validateReportTemplate({ ...valid(), layout })).toThrow('1–50 sections');
    });

    it('accepts the maximum section count', () => {
        expect(validateReportTemplate({ ...valid(), layout: Array.from({ length: 50 }, () => valid().layout[0]) }).layout).toHaveLength(50);
    });

    it.each([null, { type: 'script', title: 'No' }, { type: 'summary', title: '' }, { type: 'summary', title: 'x'.repeat(121) }])('rejects invalid section: %j', section => {
        expect(() => validateReportTemplate({ ...valid(), layout: [section] })).toThrow();
    });

    it('rejects malformed JSON and oversized text with actionable errors', () => {
        expect(() => parseReportTemplate('{')).toThrow('Could not read JSON');
        expect(() => parseReportTemplate(' '.repeat(MAX_TEMPLATE_BYTES + 1))).toThrow('64 KB');
    });

    it('uses bounded, safe filenames with a fallback for non-ASCII names', () => {
        expect(templateFileName('../Client / Report?')).toBe('Client-Report-template.json');
        expect(templateFileName('📋')).toBe('report-template.json');
        expect(templateFileName('x'.repeat(200))).toBe(`${'x'.repeat(80)}-template.json`);
    });
});
