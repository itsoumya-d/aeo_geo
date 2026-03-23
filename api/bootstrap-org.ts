import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

type JsonResponse = {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => {
        json: (body: unknown) => void;
    };
};

function deriveOrganizationName(
    providedName: unknown,
    user: { email?: string | null; full_name?: string | null }
): string {
    if (typeof providedName === 'string' && providedName.trim().length > 0) {
        return providedName.trim().slice(0, 80);
    }

    if (user.full_name && user.full_name.trim().length > 0) {
        return `${user.full_name.trim().slice(0, 60)} Workspace`;
    }

    if (user.email) {
        const local = user.email.split('@')[0]?.trim();
        if (local) return `${local.slice(0, 30)} Workspace`;
    }

    return 'My Workspace';
}

function generateWorkspaceSlug(name: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

    return `${base || 'workspace'}-${crypto.randomUUID().slice(0, 8)}`;
}

async function ensureDefaultWorkspace(
    supabaseAdmin: any,
    organizationId: string,
    organizationName: string,
    userId: string
) {
    const { data: existingWorkspace, error: workspaceLookupError } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (workspaceLookupError) {
        console.error('[bootstrap-org] workspace lookup failed:', workspaceLookupError);
        throw new Error('Could not check your workspace.');
    }

    if (existingWorkspace) {
        return;
    }

    const baseWorkspace = {
        organization_id: organizationId,
        name: organizationName,
        description: 'Default workspace',
        created_by: userId,
    };

    let workspaceError = (await supabaseAdmin
        .from('workspaces')
        .insert({
            ...baseWorkspace,
            slug: generateWorkspaceSlug(organizationName),
        } as any)).error;

    if (workspaceError && /column .*slug/i.test(workspaceError.message || '')) {
        workspaceError = (await supabaseAdmin
            .from('workspaces')
            .insert(baseWorkspace as any)).error;
    }

    if (workspaceError) {
        console.error('[bootstrap-org] workspace create failed:', workspaceError);
        throw new Error('Could not create your default workspace.');
    }
}

export default async function handler(
    req: { method?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown },
    res: JsonResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
        return res.status(500).json({ error: 'Server configuration is incomplete.' });
    }

    const authHeader = req.headers?.authorization;
    if (!authHeader || Array.isArray(authHeader)) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    let requestBody: Record<string, unknown> = {};
    try {
        requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown> | null) ?? {};
    } catch {
        return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: authHeader,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    const user = authData.user;
    const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
    const avatarUrl = typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null;

    const { error: profileUpsertError } = await supabaseAdmin
        .from('users')
        .upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: avatarUrl,
        }, { onConflict: 'id' });

    if (profileUpsertError) {
        console.error('[bootstrap-org] profile upsert failed:', profileUpsertError);
        return res.status(500).json({ error: 'Could not create your profile.' });
    }

    const { data: userRow, error: userRowError } = await supabaseAdmin
        .from('users')
        .select('organization_id, email, full_name')
        .eq('id', user.id)
        .single();

    if (userRowError) {
        console.error('[bootstrap-org] profile fetch failed:', userRowError);
        return res.status(500).json({ error: 'Could not load your profile.' });
    }

    let organizationId = userRow.organization_id;
    let created = false;

    if (organizationId) {
        const { data: existingOrganization, error: existingOrganizationError } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('id', organizationId)
            .maybeSingle();

        if (existingOrganizationError) {
            console.error('[bootstrap-org] existing organization lookup failed:', existingOrganizationError);
            return res.status(500).json({ error: 'Could not validate your organization.' });
        }

        if (!existingOrganization) {
            const { error: clearOrganizationError } = await supabaseAdmin
                .from('users')
                .update({ organization_id: null })
                .eq('id', user.id);

            if (clearOrganizationError) {
                console.error('[bootstrap-org] failed to clear broken organization link:', clearOrganizationError);
                return res.status(500).json({ error: 'Could not repair your account.' });
            }

            organizationId = null;
        }
    }

    if (!organizationId) {
        const organizationName = deriveOrganizationName(requestBody?.name, {
            email: user.email,
            full_name: fullName || userRow.full_name,
        });

        const { data: organization, error: organizationError } = await supabaseAdmin
            .from('organizations')
            .insert({ name: organizationName })
            .select('*')
            .single();

        if (organizationError || !organization) {
            console.error('[bootstrap-org] organization create failed:', organizationError);
            return res.status(500).json({ error: 'Could not create your organization.' });
        }

        const { data: updatedUsers, error: updateUserError } = await supabaseAdmin
            .from('users')
            .update({
                organization_id: organization.id,
                role: 'owner',
            })
            .eq('id', user.id)
            .select('id');

        if (updateUserError || !updatedUsers || updatedUsers.length === 0) {
            console.error('[bootstrap-org] user organization update failed:', updateUserError);
            return res.status(500).json({ error: 'Could not link your account to the organization.' });
        }

        organizationId = organization.id;
        created = true;

        try {
            await ensureDefaultWorkspace(supabaseAdmin, organization.id, organization.name, user.id);
        } catch (workspaceError) {
            const message = workspaceError instanceof Error ? workspaceError.message : 'Could not create your default workspace.';
            return res.status(500).json({ error: message });
        }
    }

    const { data: organization, error: organizationFetchError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

    if (organizationFetchError) {
        console.error('[bootstrap-org] organization fetch failed:', organizationFetchError);
        return res.status(500).json({ error: 'Could not load your organization.' });
    }

    try {
        await ensureDefaultWorkspace(supabaseAdmin, organization.id, organization.name, user.id);
    } catch (workspaceError) {
        const message = workspaceError instanceof Error ? workspaceError.message : 'Could not create your default workspace.';
        return res.status(500).json({ error: message });
    }

    let { data: onboarding, error: onboardingError } = await supabaseAdmin
        .from('organization_onboarding')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (onboardingError) {
        console.error('[bootstrap-org] onboarding fetch failed:', onboardingError);
        return res.status(500).json({ error: 'Could not load your onboarding state.' });
    }

    if (!onboarding) {
        const onboardingInsert = await supabaseAdmin
            .from('organization_onboarding')
            .insert({ organization_id: organizationId })
            .select('*')
            .single();

        onboarding = onboardingInsert.data;
        onboardingError = onboardingInsert.error;
    }

    if (onboardingError || !onboarding) {
        console.error('[bootstrap-org] onboarding create failed:', onboardingError);
        return res.status(500).json({ error: 'Could not initialize your onboarding state.' });
    }

    return res.status(200).json({
        success: true,
        created,
        organization,
        onboarding,
    });
}
