export type MediaKind = 'image' | 'video' | 'document';
export const uploadLimits: Record<MediaKind, number> = { image: 10 * 1024 * 1024, video: 50 * 1024 * 1024, document: 10 * 1024 * 1024 };
export const uploadAccept: Record<MediaKind, string> = { image: '.png,.jpg,.jpeg,.gif,.webp', video: '.mp4,.webm', document: '.pdf,.txt' };
export const uploadHints: Record<MediaKind, string> = { image: 'PNG, JPEG, GIF, WebP · up to 10 MB', video: 'MP4, WebM · up to 50 MB', document: 'PDF, TXT · up to 10 MB' };
export function mediaKindForField(field: string): MediaKind | undefined {
 return ['image','portrait'].includes(field) ? 'image' : field === 'video' ? 'video' : field === 'cv' ? 'document' : undefined;
}
export function validateSelectedFile(file: Pick<File,'name'|'size'|'type'>, kind: MediaKind): string | undefined {
 if(file.size === 0) return 'The selected file is empty.';
 if(file.size > uploadLimits[kind]) return `File is too large. ${uploadHints[kind]}.`;
 const extension = '.' + file.name.split('.').at(-1)?.toLowerCase();
 if(!uploadAccept[kind].split(',').includes(extension)) return `Unsupported file type. ${uploadHints[kind]}.`;
 return undefined;
}
export function validateFieldUrl(value: string, kind?: MediaKind): string | undefined {
 if(!value) return undefined;
 if(/[\x00-\x20\\]/.test(value) || value.length > 2048) return 'Use a valid URL without spaces or backslashes.';
 if(value.startsWith('/') && !value.startsWith('//')) return undefined;
 if(!kind && /^#[\w-]+$/.test(value)) return undefined;
 try { const url = new URL(value); if(['http:','https:'].includes(url.protocol) && url.hostname) return undefined; if(!kind && ['mailto:','tel:'].includes(url.protocol)) return undefined; } catch {}
 return kind ? 'Use an https URL or local file path, or upload a file from your device.' : 'Use an http/https URL, local path, section anchor, email or phone link.';
}
export function canonicalLink(value: string): string { try { return new URL(value.trim()).href; } catch { return value.trim(); } }
export type UploadMetadata = { id: string; url: string; name: string; type: string; size: number; kind: MediaKind; createdAt: string };
