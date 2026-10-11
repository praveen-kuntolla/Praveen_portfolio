import { describe, expect, it } from 'vitest';
import { driveFile, imageDisplayUrl } from './image-links';
describe('Drive image rendering URLs', () => {
  const id = '1wAI_0FNF52X7rONMs6FgQbI0McxFl9mq';
  it('converts the supplied sharing link to the verified image endpoint', () => {
    expect(imageDisplayUrl('https://drive.google.com/file/d/' + id + '/view?usp=drive_link')).toBe('https://drive.google.com/thumbnail?id=' + id + '&sz=w1600');
  });
  it('supports open, download, thumbnail and preview links without modifying stored values', () => {
    for (const value of ['https://drive.google.com/open?id=' + id, 'https://drive.google.com/uc?export=view&id=' + id, 'https://drive.google.com/thumbnail?id=' + id, 'https://drive.google.com/file/d/' + id + '/preview']) expect(driveFile(value)?.id).toBe(id);
  });
  it('preserves resource keys required by some shared files', () => {
    const result = new URL(imageDisplayUrl('https://drive.google.com/file/d/' + id + '/view?resourcekey=0-AbC_123'));
    expect(result.searchParams.get('resourcekey')).toBe('0-AbC_123');
  });
  it('leaves ordinary images and local files unchanged and rejects fake Drive hosts', () => {
    for (const value of ['/portfolio/motion.svg', 'https://cdn.example.com/photo.png', 'https://drive.google.com.evil.test/file/d/' + id + '/view', 'https://drive.google.com/drive/folders/' + id, 'https://user:pass@drive.google.com/file/d/' + id + '/view', 'javascript:alert(1)']) {
      expect(driveFile(value)).toBeNull();
      expect(imageDisplayUrl(value)).toBe(value);
    }
  });
});
