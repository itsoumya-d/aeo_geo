import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

export default async function handler(req: { method?: string; body?: any }, res: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!supabaseUrl || !supabaseSecretKey) {
        return res.status(500).json({ error: 'Server configuration is incomplete.' });
    }

    let requestBody: Record<string, unknown> = {};

    try {
        requestBody = typeof req.body === 'string'
            ? JSON.parse(req.body)
            : req.body ?? {};
    } catch {
        return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    const websiteUrl = typeof requestBody.websiteUrl === 'string' ? requestBody.websiteUrl.trim() : '';
    const providedDomain = typeof requestBody.domainUrl === 'string' ? requestBody.domainUrl.trim() : '';

    if (!websiteUrl) {
        return res.status(400).json({ error: 'Website URL is required.' });
    }

    let hostname = providedDomain;

    try {
        const parsedUrl = new URL(websiteUrl.startsWith('http://') || websiteUrl.startsWith('https://') ? websiteUrl : `https://${websiteUrl}`);
        hostname = parsedUrl.hostname.replace(/^www\./, '');
    } catch {
        return res.status(400).json({ error: 'Enter a valid website URL.' });
    }

    if (!hostname) {
        return res.status(400).json({ error: 'Enter a valid website URL.' });
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const { data, error } = await supabase
        .from('public_audit_requests')
        .insert([
            {
                domain_url: hostname,
                email: `free-audit+${hostname.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'lead'}@cognition.local`,
                status: 'pending',
            }
        ])
        .select('id, domain_url, email, created_at')
        .single();

    if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, auditRequest: data });
}
