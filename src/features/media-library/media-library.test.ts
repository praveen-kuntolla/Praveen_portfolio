// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaInputSchema, applyPublishedMedia, supportedVideo } from './model';
import { defaultPortfolio } from '@/features/portfolio/data';
const mocks = vi.hoisted(() => ({
  server: vi.fn(), public: vi.fn(), invalidate: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: mocks.server, createSupabasePublicClient: mocks.public }));
vi.mock('@/lib/supabase/config', () => ({ supabaseConfigured: () => true }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.invalidate }));
import { GET, POST, PUT, PATCH, DELETE } from '@/app/api/media-library/route';
import { POST as login } from '@/app/api/media-library/session/route';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const image = { title: 'A photo', description: 'Description', media_type: 'image' as const, media_url: 'https://cdn.example.com/photo.jpg', thumbnail_url: null, display_order: 0, published: false };
function client(admin = true, signedIn = true, permissions = ['view_back_office','manage_media','publish_content','invite_admins']) {
  const result = { data: [{ id }], error: null };
  const chain = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: admin ? { role: 'admin', status: 'active', permissions } : null, error: null }),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  const db = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: signedIn ? { id } : null }, error: null }), signInWithPassword: vi.fn().mockResolvedValue({ error: null }), signOut: vi.fn().mockResolvedValue({ error: null }) },
    from: vi.fn().mockReturnValue({ ...chain, insert: vi.fn().mockReturnValue(chain), update: vi.fn().mockReturnValue(chain), delete: vi.fn().mockReturnValue(chain) }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  };
  return { db, chain };
}
function request(method: string, body?: unknown, origin = 'https://portfolio.test') {
  return new Request('https://portfolio.test/api/media-library', { method, headers: { origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); });
describe('media URL validation and mapping', () => {
  it('accepts HTTPS images and supported players, rejects HTML and unsafe URLs', () => {
    expect(mediaInputSchema.safeParse(image).success).toBe(true);
    for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://vimeo.com/12345', 'https://drive.google.com/file/d/abc_123/view', 'https://cdn.example.com/movie.mp4?token=x']) expect(supportedVideo(url)).toBe(true);
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'http://example.com/image.jpg', 'https://user:pass@example.com/a', 'https://example.com/a b']) expect(mediaInputSchema.safeParse({ ...image, media_url: url }).success).toBe(false);
    for (const url of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://example.com/page.html', 'https://youtu.be/bad']) expect(supportedVideo(url)).toBe(false);
    expect(mediaInputSchema.safeParse({ ...image, media_type: 'video', media_url: 'https://example.com/page.html' }).success).toBe(false);
  });
  it('rejects invalid fields and attempts to provide administrator metadata', () => {
    for (const fields of [{ title: '' }, { display_order: -1 }, { display_order: 1.5 }, { published: 'true' }, { role: 'admin' }, { thumbnail_url: 'javascript:alert(1)' }]) expect(mediaInputSchema.safeParse({ ...image, ...fields }).success).toBe(false);
  });
  it('maps only published media into the existing two-row gallery', () => {
    const record = { ...image, id, created_at: '', updated_at: '' };
    const result = applyPublishedMedia(defaultPortfolio, [record, { ...record, id: 'image', published: true }, { ...record, id: 'video', published: true, media_type: 'video', media_url: 'https://vimeo.com/12345' }]);
    expect(result.works.top).toHaveLength(1);
    expect(result.works.top[0].image).toBe(image.media_url);
    expect(result.works.bottom[0].video).toBe('https://vimeo.com/12345');
    expect(result.hero).toBe(defaultPortfolio.hero);
    expect(applyPublishedMedia(defaultPortfolio, []).works.top).toEqual([]);
  });
});
describe('protected media APIs (mocked Supabase)', () => {
  it('uses an anonymous client and explicit published filter for public reads', async () => {
    const { db, chain } = client();
    mocks.public.mockReturnValue(db);
    expect((await GET(request('GET'))).status).toBe(200);
    expect(mocks.server).not.toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('published', true);
    expect(db.auth.getUser).not.toHaveBeenCalled();
  });
  it('rejects every mutation for anonymous and ordinary authenticated users, including localhost', async () => {
    for (const signedIn of [false, true]) {
      const { db } = client(false, signedIn); mocks.server.mockResolvedValue(db);
      for (const [method, handler] of [['POST', POST], ['PUT', PUT], ['PATCH', PATCH], ['DELETE', DELETE]] as const) {
        const response = await handler(new Request('http://127.0.0.1:3001/api/media-library', { method, headers: { origin: 'http://127.0.0.1:3001' }, body: JSON.stringify({ ...image, id }) }));
        expect(response.status).toBe(signedIn ? 403 : 401);
      }
      expect(db.rpc).not.toHaveBeenCalled();
      expect(db.from.mock.calls.every(([table]) => table === 'back_office_access')).toBe(true);
    }
  });
  it('checks origin before accessing Supabase', async () => {
    expect((await POST(request('POST', image, 'https://foreign.test'))).status).toBe(403);
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it('allows media drafts but denies publishing without publish permission', async () => {
    const { db } = client(true, true, ['view_back_office','manage_media']); mocks.server.mockResolvedValue(db);
    expect((await POST(request('POST', image))).status).toBe(200);
    expect((await POST(request('POST', { ...image, published: true }))).status).toBe(403);
  });
  it('adds, edits, publishes, unpublishes, reorders and deletes with authorization and invalidation', async () => {
    const { db } = client(); mocks.server.mockResolvedValue(db);
    expect((await POST(request('POST', image))).status).toBe(200);
    expect((await PUT(request('PUT', { ...image, id, title: 'Edited', published: true }))).status).toBe(200);
    expect((await PUT(request('PUT', { ...image, id, published: false }))).status).toBe(200);
    expect((await PATCH(request('PATCH', { id, direction: -1 }))).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith('portfolio_move_media', { target_id: id, direction: -1 });
    expect((await DELETE(request('DELETE', { id }))).status).toBe(200);
    expect(db.auth.getUser.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(mocks.invalidate).toHaveBeenCalledTimes(5);
    expect(mocks.invalidate).toHaveBeenCalledWith('/');
  });
  it('rejects invalid URLs, malformed bodies, IDs and role assignment', async () => {
    const { db } = client(); mocks.server.mockResolvedValue(db);
    expect((await POST(request('POST', { ...image, media_url: 'javascript:alert(1)' }))).status).toBe(400);
    expect((await POST(request('POST', { ...image, role: 'admin' }))).status).toBe(400);
    expect((await DELETE(request('DELETE', { id: '../outside' }))).status).toBe(400);
    expect((await PATCH(request('PATCH', { id, direction: 3 }))).status).toBe(400);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it('signs an ordinary account back out when administrator verification fails', async () => {
    const { db } = client(false); mocks.server.mockResolvedValue(db);
    const response = await login(request('POST', { email: 'owner@example.com', password: 'test-password' }));
    expect(response.status).toBe(403);
    expect(db.auth.signOut).toHaveBeenCalled();
  });
  it('does not leak database diagnostics in responses', async () => {
    mocks.public.mockImplementation(() => { throw new Error('private connection string'); });
    const response = await GET(request('GET'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private connection string');
  });
});
