'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { mediaInputSchema, supportedVideo, validMediaUrl, type MediaInput, type MediaRecord } from './model';
import { videoEmbedUrl } from '@/features/portfolio/video-links';
import { imageDisplayUrl } from '@/features/portfolio/image-links';
import '@/features/portfolio/portfolio.css';
import './manager.css';
const blank: MediaInput = { title: '', description: '', media_type: 'image', media_url: '', thumbnail_url: null, display_order: 0, published: false };
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch('/api/media-library' + path, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function Preview({ item }: { item: MediaInput }) {
  const [failed, setFailed] = useState(false);

  if (!validMediaUrl(item.media_url)) return <p>Enter a valid HTTPS URL to preview.</p>;
  if (failed) return <p role="alert">Preview could not load. For Google Drive, set General access to Anyone with the link, then check that this is an image file.</p>;
  if (item.media_type === 'image') return <img src={imageDisplayUrl(item.media_url)} alt={item.title || 'Image preview'} onError={() => setFailed(true)} />;
  if (!supportedVideo(item.media_url)) return <p>Use YouTube, Vimeo, Google Drive, or a direct MP4, WebM or OGG URL.</p>;
  const embed = videoEmbedUrl(item.media_url);
  return embed ? <><iframe src={embed} title={item.title || 'Video preview'} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /><small>If the player refuses playback, enable public sharing and embedding at the source.</small></> : <video src={item.media_url} controls playsInline poster={item.thumbnail_url && validMediaUrl(item.thumbnail_url) ? imageDisplayUrl(item.thumbnail_url) : undefined} onError={() => setFailed(true)} />;
}
export function MediaManager() {
  const [session, setSession] = useState<{ configured: boolean; authenticated: boolean } | null>(null);
  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [form, setForm] = useState<MediaInput>(blank);
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<MediaInput | null>(null);
  useEffect(() => {
    let active = true;
    api('/session').then(s => { if (active) { setSession(s); if (s.error) setError(s.error); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function load() {
    setLoading(true);
    try { const result = await api('?admin=1'); setRecords(result.records); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!session?.authenticated) return;
    let active = true;
    api('?admin=1').then(r => { if (active) setRecords(r.records); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.authenticated]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); }
    finally { setBusy(false); }
  }
  function announce(message: string) {
    setNotice(message);
    try { localStorage.setItem('pk-media-library-updated', String(Date.now())); } catch { /* Publication succeeds even if browser storage is disabled. */ }
  }
  function edit(r: MediaRecord) {
    const { title, description, media_type, media_url, thumbnail_url, display_order, published } = r;
    setForm({ title, description, media_type, media_url, thumbnail_url, display_order, published }); setId(r.id); setPreview(null);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const parsed = mediaInputSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(' ')); return; }
    void run(async () => {
      await api('', id ? 'PUT' : 'POST', { ...parsed.data, ...(id ? { id } : {}) });
      setForm(blank); setId(null); setPreview(null); announce('Saved. Published changes are now available on the public portfolio.'); await load();
    });
  }
  const messages = <>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{busy && <p role="status">Saving…</p>}</>;
  if (!session?.authenticated) return <main className="pk-media-manager"><header><Link href="/studio">← PK Studio</Link><h1>Media Back Office</h1></header>{messages}{!session ? <p>{error ? 'Reload this page after fixing the connection.' : 'Checking session…'}</p> : !session.configured ? <p>Complete SUPABASE_SETUP.md and restart the app to connect your database.</p> : <form onSubmit={event => { event.preventDefault(); void run(async () => { await api('/session', 'POST', { email, password }); setPassword(''); setSession({ configured: true, authenticated: true }); }); }}><label>Administrator email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy}>Sign in</button></form>}</main>;
  return <main className="pk-media-manager"><header><Link href="/studio">← Visual Studio</Link><h1>Media Back Office</h1><Link href="/#works" target="_blank">View public gallery ↗</Link><button disabled={busy} onClick={() => void run(async () => { await api('/session', 'DELETE'); setRecords([]); setPreview(null); setForm(blank); setId(null); setSession({ configured: true, authenticated: false }); })}>Sign out</button></header>{messages}<div className="pk-media-columns"><section><h2>{id ? 'Edit media' : 'Add media'}</h2><form onSubmit={save}><fieldset disabled={busy}><label>Title<input required maxLength={250} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label><label>Description<textarea maxLength={4000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label>Media type<select value={form.media_type} onChange={e => setForm({ ...form, media_type: e.target.value as MediaInput['media_type'] })}><option value="image">Image</option><option value="video">Video</option></select></label><label>Media URL<input type="url" required value={form.media_url} onChange={e => setForm({ ...form, media_url: e.target.value })} /></label><small>HTTPS images or Google Drive image sharing links; YouTube, Vimeo, Google Drive videos; direct .mp4, .webm or .ogg videos.</small><label>Thumbnail URL (optional)<input type="url" value={form.thumbnail_url || ''} onChange={e => setForm({ ...form, thumbnail_url: e.target.value || null })} /></label><label>Display order (lower appears first)<input type="number" min={0} max={2147483647} step={1} required value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></label><label className="pk-media-check"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />Published</label><button type="submit">{busy ? 'Saving…' : 'Save media'}</button><button type="button" onClick={() => setPreview(form)}>Preview</button><button type="button" onClick={() => { setId(null); setForm(blank); setPreview(null); }}>New / cancel edit</button></fieldset></form>{preview && <div className="pk-media-preview"><h3>Preview</h3><Preview key={preview.media_type + preview.media_url + preview.thumbnail_url} item={preview} /></div>}</section><section aria-label="Media records"><h2>Media library</h2><button disabled={busy || loading} onClick={() => void run(load)}>Refresh</button>{loading && <p role="status">Loading media…</p>}{!loading && !records.length && <p>No media yet. Add a URL, preview it, and save.</p>}{records.map((r, index) => <article key={r.id}><h3>{r.title}</h3><p>{r.media_type} · Order {r.display_order} · {r.published ? 'Published' : 'Draft'}</p><p>{r.description}</p><div><button disabled={busy} onClick={() => edit(r)}>Edit</button><button disabled={busy} onClick={() => setPreview(r)}>Preview</button><button disabled={busy} onClick={() => void run(async () => { const { id, created_at: _created, updated_at: _updated, ...input } = r; void _created; void _updated; await api('', 'PUT', { id, ...input, published: !r.published }); announce(r.published ? 'Unpublished.' : 'Published. Open the public gallery to confirm.'); await load(); })}>{r.published ? 'Unpublish' : 'Publish'}</button>{([-1, 1] as const).map(direction => <button key={direction} aria-label={`Move ${r.title} ${direction < 0 ? 'up' : 'down'}`} disabled={busy || (direction < 0 ? index === 0 : index === records.length - 1)} onClick={() => void run(async () => { await api('', 'PATCH', { id: r.id, direction }); announce('Order saved.'); await load(); })}>{direction < 0 ? '↑' : '↓'}</button>)}<button disabled={busy} onClick={() => { if (confirm(`Delete “${r.title}”? This cannot be undone.`)) void run(async () => { await api('', 'DELETE', { id: r.id }); if (id === r.id) { setId(null); setForm(blank); } setPreview(null); announce('Deleted.'); await load(); }); }}>Delete</button></div></article>)}</section></div></main>;
}



