// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Identify the calling Supabase user from the request's Authorization header.
 * Returns both the verified user object and an admin client (service-role) so
 * functions can read/write the locked-down `user_calendar_connections` table.
 */
export const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

export const requireUser = async (req: Request): Promise<{ id: string; email?: string } | null> => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
};

export const json = (body: unknown, init: ResponseInit = {}, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...extra, ...(init.headers ?? {}) },
  });
