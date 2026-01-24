import { supabase } from './supabase';

/**
 * SSO Service
 * Manages Enterprise Single Sign-On (SAML 2.0) configurations.
 */

export interface SAMLConfig {
    id: string;
    organization_id: string;
    entity_id: string;
    metadata_url?: string;
    metadata_xml?: string;
    attribute_mapping?: Record<string, string>;
    created_at: string;
}

/**
 * Initiate SSO Login
 */
export async function signInWithSSO(domain: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithSSO({
        domain
    });

    if (error) {
        console.error('SSO Login failed:', error);
        throw error;
    }

    if (data?.url) {
        window.location.href = data.url;
    }
}

/**
 * Register a new SAML Identity Provider (Enterprise Only)
 */
export async function registerSAMLIdP(params: {
    organizationId: string;
    metadataUrl: string;
}): Promise<boolean> {
    // This typically requires Supabase CLI or Service Role Key via Edge Function
    // Here we simulate the registration and store metadata for visibility
    const { error } = await supabase
        .from('sso_configurations')
        .upsert({
            organization_id: params.organizationId,
            metadata_url: params.metadataUrl,
            entity_id: `https://auth.cognition.ai/sso/${params.organizationId}`
        }, { onConflict: 'organization_id' });

    if (error) {
        console.error('Failed to register SAML IdP:', error);
        return false;
    }

    return true;
}

/**
 * Get the current SSO configuration for an organization
 */
export async function getSSOConfig(organizationId: string): Promise<SAMLConfig | null> {
    const { data, error } = await supabase
        .from('sso_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (error) {
        console.error('Failed to fetch SSO config:', error);
        return null;
    }

    return data;
}

export default {
    signInWithSSO,
    registerSAMLIdP,
    getSSOConfig
};
