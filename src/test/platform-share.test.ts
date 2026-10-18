import { describe, expect, it } from 'vitest';
import { PLATFORM_HOME_URL, SHARE_DOWNLOADS } from '@/lib/platform-share';

describe('Platform share downloads', () => {
  it('shares the public homepage, not the preview or current calculator', () => {
    expect(PLATFORM_HOME_URL).toBe('https://investicoacademy.lovable.app/');
  });
  it('provides a PNG business card', () => {
    expect(SHARE_DOWNLOADS.find(file => file.id === 'card')?.type).toBe('image/png');
  });
  it('provides a standard QR PNG image', () => {
    expect(SHARE_DOWNLOADS.find(file => file.id === 'qr')?.type).toBe('image/png');
  });
  it('provides a PDF brochure', () => {
    expect(SHARE_DOWNLOADS.find(file => file.id === 'pdf')?.type).toBe('application/pdf');
  });
  it('keeps every download on the same-origin asset service', () => {
    for (const file of SHARE_DOWNLOADS) expect(file.url.startsWith('/__l5e/assets-v1/')).toBe(true);
  });
});