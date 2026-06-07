/**
 * @file site-match.test.ts
 * @description Unit tests for pure hostname matching helpers used by the
 *              per-site pause (siteAllowlist) feature.
 */
import { describe, it, expect } from 'vitest';
import { normalizeHost, isHostExcluded, toggleSiteExclusion } from '@/shared/utils/site-match';

describe('normalizeHost', () => {
  it('lowercases and trims', () => {
    expect(normalizeHost('  ChatGPT.com  ')).toBe('chatgpt.com');
  });
  it('strips a single leading www.', () => {
    expect(normalizeHost('www.claude.ai')).toBe('claude.ai');
  });
  it('does not strip non-leading www', () => {
    expect(normalizeHost('app.www.example.com')).toBe('app.www.example.com');
  });
  it('returns empty string for empty/invalid input', () => {
    expect(normalizeHost('')).toBe('');
    expect(normalizeHost('   ')).toBe('');
  });
});

describe('isHostExcluded', () => {
  it('matches an exact normalized host', () => {
    expect(isHostExcluded('chatgpt.com', ['chatgpt.com'])).toBe(true);
  });
  it('matches case-insensitively and ignoring www.', () => {
    expect(isHostExcluded('WWW.ChatGPT.com', ['chatgpt.com'])).toBe(true);
    expect(isHostExcluded('chatgpt.com', ['www.ChatGPT.COM'])).toBe(true);
  });
  it('does not match a different subdomain (no globbing)', () => {
    expect(isHostExcluded('chat.chatgpt.com', ['chatgpt.com'])).toBe(false);
  });
  it('returns false for empty host or empty list', () => {
    expect(isHostExcluded('', ['chatgpt.com'])).toBe(false);
    expect(isHostExcluded('chatgpt.com', [])).toBe(false);
  });
});

describe('toggleSiteExclusion', () => {
  it('adds a normalized host when absent', () => {
    expect(toggleSiteExclusion('WWW.Claude.ai', ['chatgpt.com'])).toEqual([
      'chatgpt.com',
      'claude.ai',
    ]);
  });
  it('removes a host when present (normalized comparison)', () => {
    expect(toggleSiteExclusion('chatgpt.com', ['www.chatgpt.com', 'claude.ai'])).toEqual([
      'claude.ai',
    ]);
  });
  it('dedupes the existing list', () => {
    expect(toggleSiteExclusion('claude.ai', ['chatgpt.com', 'chatgpt.com'])).toEqual([
      'chatgpt.com',
      'claude.ai',
    ]);
  });
  it('returns a copy unchanged for empty host', () => {
    expect(toggleSiteExclusion('', ['chatgpt.com'])).toEqual(['chatgpt.com']);
  });
});
