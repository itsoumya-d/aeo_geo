export type TabType = 'overview' | 'pages' | 'consistency' | 'search' | 'optimization' | 'benchmark' | 'reports' | 'integrations' | 'history' | 'sandbox' | 'settings' | 'recommendations';

export interface Branding {
    logo_url: string | null;
    primary_color: string;
    company_name: string;
    hide_cognition_branding: boolean;
}
