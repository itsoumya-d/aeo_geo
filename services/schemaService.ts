import { SchemaAnalysis } from '../types';

export async function validateSiteSchema(
    urls: string[],
    websiteContent: string
): Promise<SchemaAnalysis> {
    const response = await fetch('/api/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'VALIDATE_SCHEMA',
            payload: { urls, websiteContent }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Schema validation failed: ${error}`);
    }

    return response.json() as Promise<SchemaAnalysis>;
}
