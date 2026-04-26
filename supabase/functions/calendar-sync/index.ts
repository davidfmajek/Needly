// Edge Function: pull events from each connected calendar in a given range
// and return them in a normalized shape ready for the My Day grid.
//
// Required Supabase secrets:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "../_shared/cors.ts";
import { adminClient, json, requireUser } from "../_shared/auth.ts";

type Provider = "google" | "microsoft";

interface NormalizedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  provider: Provider;
  allDay?: boolean;
}

interface Body { start?: string; end?: string }

const refreshGoogle = async (refreshToken: string) => {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.ok ? await res.json() : null;
};

const refreshMicrosoft = async (refreshToken: string) => {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "openid email offline_access https://graph.microsoft.com/Calendars.Read",
    }),
  });
  return res.ok ? await res.json() : null;
};

const getValidAccessToken = async (
  conn: any,
  refresh: (rt: string) => Promise<any>,
): Promise<{ access: string; refreshed?: any } | null> => {
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  // Refresh if missing, expiring within 60 seconds, or expired.
  if (conn.access_token && expiresAt - Date.now() > 60_000) {
    return { access: conn.access_token };
  }
  if (!conn.refresh_token) return null;
  const refreshed = await refresh(conn.refresh_token);
  if (!refreshed?.access_token) return null;
  return { access: refreshed.access_token, refreshed };
};

const fetchGoogleEvents = async (token: string, start: string, end: string): Promise<NormalizedEvent[]> => {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", start);
  url.searchParams.set("timeMax", end);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "100");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []).map((it: any) => ({
    id: `google:${it.id}`,
    title: it.summary ?? "(no title)",
    start: it.start?.dateTime ?? it.start?.date ?? start,
    end: it.end?.dateTime ?? it.end?.date ?? end,
    provider: "google" as Provider,
    allDay: Boolean(it.start?.date && !it.start?.dateTime),
  }));
};

const fetchMicrosoftEvents = async (token: string, start: string, end: string): Promise<NormalizedEvent[]> => {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", start);
  url.searchParams.set("endDateTime", end);
  url.searchParams.set("$top", "100");
  url.searchParams.set("$orderby", "start/dateTime");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.value ?? []).map((it: any) => ({
    id: `microsoft:${it.id}`,
    title: it.subject ?? "(no title)",
    start: `${it.start?.dateTime ?? start}Z`.replace("ZZ", "Z"),
    end: `${it.end?.dateTime ?? end}Z`.replace("ZZ", "Z"),
    provider: "microsoft" as Provider,
    allDay: Boolean(it.isAllDay),
  }));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 }, corsHeaders);

  const { start, end }: Body = await req.json().catch(() => ({}));
  if (!start || !end) return json({ error: "Missing range" }, { status: 400 }, corsHeaders);

  const admin = adminClient();
  const { data: connections, error } = await admin
    .from("user_calendar_connections")
    .select("*")
    .eq("user_id", user.id);
  if (error) return json({ error: error.message }, { status: 500 }, corsHeaders);

  const events: NormalizedEvent[] = [];
  for (const conn of connections ?? []) {
    if (conn.provider === "google") {
      const tok = await getValidAccessToken(conn, refreshGoogle);
      if (!tok) continue;
      events.push(...await fetchGoogleEvents(tok.access, start, end));
      if (tok.refreshed) {
        await admin.from("user_calendar_connections").update({
          access_token: tok.refreshed.access_token,
          expires_at: new Date(Date.now() + Number(tok.refreshed.expires_in ?? 0) * 1000).toISOString(),
        }).eq("user_id", user.id).eq("provider", "google");
      }
    } else if (conn.provider === "microsoft") {
      const tok = await getValidAccessToken(conn, refreshMicrosoft);
      if (!tok) continue;
      events.push(...await fetchMicrosoftEvents(tok.access, start, end));
      if (tok.refreshed) {
        await admin.from("user_calendar_connections").update({
          access_token: tok.refreshed.access_token,
          refresh_token: tok.refreshed.refresh_token ?? conn.refresh_token,
          expires_at: new Date(Date.now() + Number(tok.refreshed.expires_in ?? 0) * 1000).toISOString(),
        }).eq("user_id", user.id).eq("provider", "microsoft");
      }
    }
  }

  return json({ events }, { status: 200 }, corsHeaders);
});
