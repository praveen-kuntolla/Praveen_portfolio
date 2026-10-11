import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { libraryFailure, libraryResponse, LibraryError, readLibraryJson, requireLibraryOrigin, requireMediaAdmin } from '@/features/media-library/server';
import { z } from 'zod';
export async function GET() {
  if (!supabaseConfigured()) return libraryResponse({ configured: false, authenticated: false });
  try { await requireMediaAdmin(); return libraryResponse({ configured: true, authenticated: true }); }
  catch (error) {
    if (error instanceof LibraryError && [401, 403].includes(error.status)) return libraryResponse({ configured: true, authenticated: false, error: error.status === 403 ? error.message : undefined });
    return libraryFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    requireLibraryOrigin(request);
    const result = z.object({ email: z.email(), password: z.string().min(1).max(1024) }).strict().safeParse(await readLibraryJson(request));
    if (!result.success) throw new LibraryError('Enter your email and password.');
    const db = await createSupabaseServerClient();
    const { error } = await db.auth.signInWithPassword(result.data);
    if (error) throw new LibraryError('Sign-in failed. Check your email, password, and account confirmation.', 401);
    try { await requireMediaAdmin(); } catch (error) { await db.auth.signOut(); throw error; }
    return libraryResponse({ authenticated: true });
  } catch (error) { return libraryFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireLibraryOrigin(request);
    const db = await createSupabaseServerClient();
    const { error } = await db.auth.signOut();
    if (error) throw new Error('Sign out failed');
    return libraryResponse({ authenticated: false });
  } catch (error) { return libraryFailure(error); }
}
