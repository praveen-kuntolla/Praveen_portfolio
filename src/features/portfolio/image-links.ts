// Drive sharing links are viewer pages, not image responses. Keep the stored URL
// and convert only at rendering time so old drafts/database rows work immediately.
export function driveFile(value: string): { id: string; resourceKey: string | null } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.username || url.password) return null;
    const match = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/(?:view|preview))?\/?$/);
    const id = match?.[1] || (['/open', '/uc', '/thumbnail'].includes(url.pathname) ? url.searchParams.get('id') : null);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
    return { id, resourceKey: url.searchParams.get('resourcekey') };
  } catch { return null; }
}
export function imageDisplayUrl(value: string): string {
  const file = driveFile(value);
  if (!file) return value;
  const url = new URL('https://drive.google.com/thumbnail');
  url.searchParams.set('id', file.id);
  url.searchParams.set('sz', 'w1600');
  if (file.resourceKey) url.searchParams.set('resourcekey', file.resourceKey);
  return url.href;
}
