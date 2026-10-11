import { requirePermission } from '@/features/back-office/server';
export class LibraryError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const libraryResponse = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export function libraryFailure(error: unknown) {
  if (error instanceof Error && 'status' in error) return libraryResponse({ error: error.message }, Number((error as {status:number}).status));
  return libraryResponse({ error: error instanceof LibraryError ? error.message : 'Media service unavailable. Check Supabase environment values, migration, and network connection.' }, error instanceof LibraryError ? error.status : 503);
}
export function requireLibraryOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || new URL(request.url).host;
  let source: URL;
  try { source = new URL(origin || ''); } catch { throw new LibraryError('Use this website’s media manager.', 403); }
  if (source.host !== host || !['http:', 'https:'].includes(source.protocol) || request.headers.get('sec-fetch-site') === 'cross-site') throw new LibraryError('Use this website’s media manager.', 403);
}
export async function requireMediaAdmin() {
  try { return (await requirePermission('manage_media')).db; }
  catch(error){if(error instanceof Error&&'status'in error)throw new LibraryError(error.message,Number((error as {status:number}).status));throw error;}
}
export async function readLibraryJson(request: Request) {
  const text = await request.text();
  if (text.length > 16000) throw new LibraryError('Request is too large.', 413);
  try { return JSON.parse(text); } catch { throw new LibraryError('Invalid JSON.'); }
}
