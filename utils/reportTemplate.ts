export const MAX_TEMPLATE_BYTES = 64 * 1024;
export const MAX_TEMPLATE_SECTIONS = 50;
const SECTION_TYPES = ['summary', 'score', 'trends', 'competitors', 'recommendations'] as const;
type SectionType = typeof SECTION_TYPES[number];

export interface ReportTemplate {
    format: 'cognition-report-template';
    version: 1;
    name: string;
    layout: { type: SectionType; title: string }[];
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) {
        throw new Error(`${label} must contain 1–120 characters.`);
    }
    return value.trim();
}

export function validateReportTemplate(value: unknown): ReportTemplate {
    if (!isObject(value) || value.format !== 'cognition-report-template' || value.version !== 1) {
        throw new Error('This is not a supported Cognition report template (version 1).');
    }
    const name = requiredText(value.name, 'Template name');
    if (!Array.isArray(value.layout) || !value.layout.length || value.layout.length > MAX_TEMPLATE_SECTIONS) {
        throw new Error(`A template must contain 1–${MAX_TEMPLATE_SECTIONS} sections.`);
    }
    const layout = value.layout.map((section: unknown) => {
        if (!isObject(section) || !SECTION_TYPES.includes(section.type as SectionType)) {
            throw new Error('The template contains an unsupported section type.');
        }
        return { type: section.type as SectionType, title: requiredText(section.title, 'Section title') };
    });
    return { format: 'cognition-report-template', version: 1, name, layout };
}

export function parseReportTemplate(text: string): ReportTemplate {
    if (text.length > MAX_TEMPLATE_BYTES) throw new Error('Choose a template JSON file smaller than 64 KB.');
    let value: unknown;
    try { value = JSON.parse(text); }
    catch { throw new Error('Could not read JSON. Choose an exported Cognition report template.'); }
    return validateReportTemplate(value);
}

export function templateFileName(name: string): string {
    const slug = name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return `${slug || 'report'}-template.json`;
}
