import { z } from 'zod';
import { videoEmbedUrl } from '@/features/portfolio/video-links';
import type { PortfolioData, Project } from '@/features/portfolio/data';
export function validMediaUrl(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !/\s/.test(value) && !!u.hostname; } catch { return false; }
}
export function supportedVideo(value: string) {
  if (!validMediaUrl(value)) return false;
  const url = new URL(value);
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return true;
  if (!videoEmbedUrl(value)) return false;
  const host = url.hostname;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) return url.pathname === '/watch' || /^\/(embed|shorts|live)\/[A-Za-z0-9_-]{11}([/].*)?$/.test(url.pathname);
  if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) return /^\/embed\/[A-Za-z0-9_-]{11}([/].*)?$/.test(url.pathname);
  if (host === 'youtu.be') return /^\/[A-Za-z0-9_-]{11}([/].*)?$/.test(url.pathname);
  if (['vimeo.com', 'www.vimeo.com'].includes(host)) return /^\/[0-9]+([/].*)?$/.test(url.pathname);
  if (host === 'player.vimeo.com') return /^\/video\/[0-9]+([/].*)?$/.test(url.pathname);
  if (host === 'drive.google.com') return /^\/file\/d\/[A-Za-z0-9_-]+([/].*)?$/.test(url.pathname) || ['/open', '/uc'].includes(url.pathname);
  return false;
}
const httpsUrl = z.string().trim().max(2048).refine(validMediaUrl, 'Use a full HTTPS URL without spaces or credentials.').transform(v => new URL(v).href);
export const mediaInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(250),
  description: z.string().trim().max(4000),
  media_type: z.enum(['image', 'video']),
  media_url: httpsUrl,
  thumbnail_url: z.union([z.literal(''), httpsUrl]).transform(v => v || null).nullable(),
  display_order: z.number().int().min(0).max(2147483647),
  published: z.boolean(),
}).strict().superRefine((v, ctx) => {
  if (v.media_type === 'video' && !supportedVideo(v.media_url)) ctx.addIssue({ code: 'custom', path: ['media_url'], message: 'Use YouTube, Vimeo, Google Drive, or a direct .mp4, .webm or .ogg HTTPS link.' });
});
export type MediaInput = z.infer<typeof mediaInputSchema>;
export type MediaRecord = MediaInput & { id: string; created_at: string; updated_at: string };
export function applyPublishedMedia(data: PortfolioData, records: MediaRecord[]): PortfolioData {
  const cards: Project[] = records.filter(r => r.published).map(r => ({
    id: r.id, title: r.title, client: r.media_type === 'video' ? 'Video' : 'Image',
    platform: r.media_type === 'video' ? 'VIDEO' : 'IMAGE', metric: r.description,
    image: r.media_type === 'image' ? r.media_url : r.thumbnail_url || '/portfolio/motion.svg',
    video: r.media_type === 'video' ? r.media_url : '', links: [], color: '#706852',
  }));
  return { ...data, works: { ...data.works, top: cards.filter((_, i) => i % 2 === 0), bottom: cards.filter((_, i) => i % 2 === 1) } };
}

