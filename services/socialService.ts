import { supabase } from './supabase';
import { SocialAnalysis } from '../types';

export interface SocialUrls {
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
}

export async function analyzeSocialPresence(
    websiteUrl: string,
    websiteContent: string,
    socialUrls: SocialUrls
): Promise<SocialAnalysis> {
    const { data, error } = await supabase.functions.invoke('analyze-social', {
        body: { websiteUrl, websiteContent, socialUrls }
    });

    if (error) throw new Error(`Social analysis failed: ${error.message}`);
    return data as SocialAnalysis;
}
