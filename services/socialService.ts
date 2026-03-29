import { SocialAnalysis } from '../types';

export interface SocialUrls {
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
}

export async function analyzeSocialPresence(
    websiteUrl: string,
    websiteContent: string,
    socialUrls: SocialUrls
): Promise<SocialAnalysis> {
    const response = await fetch('/api/analyze-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, websiteContent, socialUrls })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Social analysis failed: ${error}`);
    }

    return response.json() as Promise<SocialAnalysis>;
}
