import { supabase } from './supabase';
import { GBPAnalysis } from '../types';

export async function analyzeGBP(
    websiteUrl: string,
    websiteContent: string
): Promise<GBPAnalysis> {
    const { data, error } = await supabase.functions.invoke('analyze-gbp', {
        body: { websiteUrl, websiteContent }
    });

    if (error) throw new Error(`GBP analysis failed: ${error.message}`);
    return data as GBPAnalysis;
}
