import { describe, expect, it } from 'vitest';
import { safeUrl, toSafeExternalUrl, toSafeInternalPath } from './safeUrl';

describe('safe URL helpers', () => {
  it('allows normalized http(s) URLs only', () => {
    expect(toSafeExternalUrl('https://jobs.example.com/apply?role=engineer')).toBe('https://jobs.example.com/apply?role=engineer');
    expect(toSafeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeExternalUrl('data:text/html,unsafe')).toBeNull();
    expect(toSafeExternalUrl('not a URL')).toBeNull();
  });

  it('keeps post-auth navigation on the current origin', () => {
    expect(toSafeInternalPath('/dashboard?from=extension', '/extension-welcome')).toBe('/dashboard?from=extension');
    expect(toSafeInternalPath('https://attacker.example', '/extension-welcome')).toBe('/extension-welcome');
    expect(toSafeInternalPath('//attacker.example', '/extension-welcome')).toBe('/extension-welcome');
  });
});

describe('safeUrl', () => {
  it('keeps ordinary web links exactly as the owner typed them', () => {
    expect(safeUrl('https://example.com/portfolio')).toBe('https://example.com/portfolio');
    expect(safeUrl('http://example.com')).toBe('http://example.com');
    expect(safeUrl('HTTPS://Example.com/Case-Study?ref=cv#top')).toBe(
      'HTTPS://Example.com/Case-Study?ref=cv#top',
    );
    expect(safeUrl('mailto:hire@example.com')).toBe('mailto:hire@example.com');
  });

  it('trims surrounding whitespace rather than rejecting the link', () => {
    expect(safeUrl('  https://example.com  ')).toBe('https://example.com');
    expect(safeUrl('\n\thttps://example.com\n')).toBe('https://example.com');
  });

  it('lets schemeless links through — they can only resolve against our origin', () => {
    expect(safeUrl('example.com')).toBe('example.com');
    expect(safeUrl('/resume/abc')).toBe('/resume/abc');
    expect(safeUrl('//cdn.example.com/x')).toBe('//cdn.example.com/x');
  });

  it('drops javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('javascript:void(0)')).toBeUndefined();
  });

  it('drops javascript: however it is cased', () => {
    expect(safeUrl('JaVaScRiPt:alert(1)')).toBeUndefined();
    expect(safeUrl('JAVASCRIPT:alert(1)')).toBeUndefined();
  });

  it('drops javascript: split by the characters browsers strip before navigating', () => {
    expect(safeUrl('java\tscript:alert(1)')).toBeUndefined();
    expect(safeUrl('java\nscript:alert(1)')).toBeUndefined();
    expect(safeUrl('java\rscript:alert(1)')).toBeUndefined();
    expect(safeUrl('java\0script:alert(1)')).toBeUndefined();
    expect(safeUrl('java\u200bscript:alert(1)')).toBeUndefined();
    expect(safeUrl('java\ufeffscript:alert(1)')).toBeUndefined();
    expect(safeUrl('\u0001javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('  \tJaVa\nScRiPt:alert(1)')).toBeUndefined();
  });

  it('drops data:, vbscript:, and every other unlisted scheme', () => {
    expect(safeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeUndefined();
    expect(safeUrl('data:image/png;base64,iVBORw0KGgo=')).toBeUndefined();
    expect(safeUrl('vbscript:msgbox(1)')).toBeUndefined();
    expect(safeUrl('VBScript:msgbox(1)')).toBeUndefined();
    expect(safeUrl('file:///etc/passwd')).toBeUndefined();
    expect(safeUrl('blob:https://careervivid.app/abc')).toBeUndefined();
    expect(safeUrl('chrome://settings')).toBeUndefined();
  });

  it('returns undefined for empty and non-string input', () => {
    expect(safeUrl('')).toBeUndefined();
    expect(safeUrl('   ')).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(42 as unknown as string)).toBeUndefined();
  });
});
