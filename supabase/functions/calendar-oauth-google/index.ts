// Edge Function: exchange a Google auth code for tokens and persist them.
//
// Required Supabase secrets:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { adminClient, json, requireUser } from "../_shared/auth.ts";

interface Body { code?: string; redirect_uri?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 }, corsHeaders);

  const { code, redirect_uri }: Body = await req.json().catch(() => ({}));
  if (!code || !redirect_uri) {
    return json({ error: "Missing code or redirect_uri" }, { status: 400 }, corsHeaders);
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return json({ error: "Google credentials not configured" }, { status: 500 }, corsHeaders);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson: any = await tokenRes.json();
  if (!tokenRes.ok) {
    return json({ error: tokenJson.error_description ?? "Token exchange failed" }, { status: 400 }, corsHeaders);
  }

  // Pull the user's email so we can show "Connected as foo@gmail.com" in the UI.
  let email: string | undefined;
  try {
    const me = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (me.ok) {
      const meJson = await me.json();
      email = meJson.email;
    }
  } catch (_) { /* non-fatal */ }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
    : null;

  const { error } = await adminClient()
    .from("user_calendar_connections")
    .upsert({
      user_id: user.id,
      provider: "google",
      email: email ?? null,
      access_token: tokenJson.access_token ?? null,
      refresh_token: tokenJson.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokenJson.scope ?? null,
    }, { onConflict: "user_id,provider" });

  if (error) return json({ error: error.message }, { status: 500 }, corsHeaders);
  return json({ ok: true, email }, { status: 200 }, corsHeaders);
});
