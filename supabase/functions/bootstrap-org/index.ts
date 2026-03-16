import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

function deriveOrganizationName(
  providedName: unknown,
  user: { email?: string | null; full_name?: string | null }
): string {
  if (typeof providedName === "string" && providedName.trim().length > 0) {
    return providedName.trim().slice(0, 80);
  }

  if (user.full_name && user.full_name.trim().length > 0) {
    return `${user.full_name.trim().slice(0, 60)} Workspace`;
  }

  if (user.email) {
    const local = user.email.split("@")[0]?.trim();
    if (local) return `${local.slice(0, 30)} Workspace`;
  }

  return "My Workspace";
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Server Misconfiguration");
    }
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const body = await req.json().catch(() => ({}));
    const organizationName = body?.name;

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await supabaseClient.auth
      .getUser();
    if (authError || !authData.user) {
      throw new Error("Unauthorized");
    }

    const userId = authData.user.id;

    const { data: userRow, error: userRowError } = await supabaseAdmin
      .from("users")
      .select("organization_id, email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (userRowError) throw userRowError;

    let created = false;
    let orgId: string | null = userRow?.organization_id ?? null;

    if (!orgId) {
      const name = deriveOrganizationName(organizationName, {
        email: authData.user.email,
        full_name: (authData.user.user_metadata as { full_name?: string })
          ?.full_name ?? userRow?.full_name,
      });

      const { data: org, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({ name })
        .select("*")
        .single();
      if (orgError) {
        // Race condition: another request may have created the org. Re-fetch user.
        const { data: retryUser } = await supabaseAdmin
          .from("users")
          .select("organization_id")
          .eq("id", userId)
          .maybeSingle();
        if (retryUser?.organization_id) {
          orgId = retryUser.organization_id;
        } else {
          throw orgError;
        }
      } else {
        const { error: updateUserError } = await supabaseAdmin
          .from("users")
          .update({ organization_id: org.id, role: "owner" })
          .eq("id", userId);
        if (updateUserError) throw updateUserError;

        orgId = org.id;
        created = true;

        // Create default workspace for new organization
        const { error: workspaceError } = await supabaseAdmin
          .from("workspaces")
          .insert({
            organization_id: org.id,
            name: org.name,
            slug: org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) + '-' + crypto.randomUUID().slice(0, 8),
            description: "Default workspace",
            created_by: userId,
          });

        if (workspaceError) {
          console.error("[Bootstrap] Failed to create default workspace:", workspaceError);
          // Non-critical error - workspace can be created later via migration
        }
      }
    }

    const { data: organization, error: orgFetchError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();
    if (orgFetchError) throw orgFetchError;

    const { data: onboardingExisting, error: onboardingFetchError } =
      await supabaseAdmin
        .from("organization_onboarding")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
    if (onboardingFetchError && onboardingFetchError.code !== "PGRST116") {
      throw onboardingFetchError;
    }

    const onboarding = onboardingExisting
      ? onboardingExisting
      : (await supabaseAdmin
        .from("organization_onboarding")
        .insert({ organization_id: orgId })
        .select("*")
        .single()).data;

    return new Response(
      JSON.stringify({
        success: true,
        created,
        organization,
        onboarding,
        data: {
          created,
          organization,
          onboarding,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({
      success: false,
      error: message,
      details: {
        code: "BOOTSTRAP_ORG_FAILED",
        message,
        requestId,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
      status: 400,
    });
  }
});
