import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';
// Call only in Route Handlers, where refreshed session cookies can be written.
export async function createSupabaseServerClient() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
}
// Public reads must never inherit an administrator's cookies.
export function createSupabasePublicClient() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } });
}

/** Server-only client for Auth administration (invites/bootstrap support). */
export function createSupabaseAdminClient() {
  const { url } = supabaseConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not configured.');
  if (key.startsWith('sb_publishable_')) throw new Error('SUPABASE_SECRET_KEY must be a secret/service-role key.');
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'service_role') throw new Error('Not a service-role key.');
    } catch { throw new Error('SUPABASE_SECRET_KEY must be a valid legacy service_role key.'); }
  } else if (!key.startsWith('sb_secret_')) throw new Error('SUPABASE_SECRET_KEY must be an sb_secret_ key or legacy service_role key.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
