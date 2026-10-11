import { createSupabasePublicClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { mediaInputSchema } from '@/features/media-library/model';
import { libraryFailure, libraryResponse, LibraryError, readLibraryJson, requireLibraryOrigin, requireMediaAdmin } from '@/features/media-library/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/features/back-office/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get('admin') === '1';
    if (!admin && !supabaseConfigured()) return libraryResponse({ configured: false, records: [] });
    const db = admin ? await requireMediaAdmin() : createSupabasePublicClient();
    let query = db.from('portfolio_media').select('*').order('display_order').order('created_at').order('id');
    if (!admin) query = query.eq('published', true);
    const { data, error } = await query;
    if (error) throw new Error('Read failed');
    return libraryResponse({ configured: true, records: data });
  } catch (error) { return libraryFailure(error); }
}
async function mutate(request: Request) {
  try {
    requireLibraryOrigin(request);
    const db = await requireMediaAdmin();
    const raw = await readLibraryJson(request);
    if (request.method === 'DELETE') {
      const result = z.object({ id: z.uuid() }).strict().safeParse(raw);
      if (!result.success) throw new LibraryError('Invalid media ID.');
      const { data, error } = await db.from('portfolio_media').delete().eq('id', result.data.id).select('id');
      if (error) throw new Error('Delete failed');
      if (!data?.length) throw new LibraryError('Record no longer exists.', 404);
    } else {
      const schema = request.method === 'POST' ? mediaInputSchema : mediaInputSchema.safeExtend({ id: z.uuid() });
      const result = schema.safeParse(raw);
      if (!result.success) throw new LibraryError(result.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(' '));
      const { id, ...values } = result.data as typeof result.data & { id?: string };
      if (values.published) await requirePermission('publish_content');
      if (id && !values.published) {
        const existing = await db.from('portfolio_media').select('published').eq('id', id).maybeSingle();
        if (existing.data?.published) await requirePermission('publish_content');
      }
      const query = request.method === 'POST' ? db.from('portfolio_media').insert(values) : db.from('portfolio_media').update(values).eq('id', id!);
      const { data, error } = await query.select('id');
      if (error) throw new Error('Save failed');
      if (!data?.length) throw new LibraryError('Record no longer exists.', 404);
    }
    revalidatePath('/');
    return libraryResponse({ saved: true });
  } catch (error) { return libraryFailure(error); }
}
export const POST = mutate;
export const PUT = mutate;
export const DELETE = mutate;
export async function PATCH(request: Request) {
  try {
    requireLibraryOrigin(request);
    const db = await requireMediaAdmin();
    const result = z.object({ id: z.uuid(), direction: z.union([z.literal(-1), z.literal(1)]) }).strict().safeParse(await readLibraryJson(request));
    if (!result.success) throw new LibraryError('Invalid reorder request.');
    const { error } = await db.rpc('portfolio_move_media', { target_id: result.data.id, direction: result.data.direction });
    if (error) throw new Error('Reorder failed');
    revalidatePath('/');
    return libraryResponse({ saved: true });
  } catch (error) { return libraryFailure(error); }
}
