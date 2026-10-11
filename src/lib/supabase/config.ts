export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Follow SUPABASE_SETUP.md.');
  if (key.startsWith('sb_secret_')) throw new Error('Use a Supabase publishable key, never a secret key.');
  // Also reject a legacy service_role JWT mistakenly pasted as the public key.
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error('Use the legacy anon key, never service_role.');
    } catch { throw new Error('Invalid public Supabase key. Use publishable or legacy anon.'); }
  }
  return { url, key };
}
export const supabaseConfigured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
