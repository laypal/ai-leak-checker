/**
 * @fileoverview Unit tests for selector-config structural validation (Task 7.2)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { validateSelectorConfig } from '@/shared/utils/selector-validation';

const validConfig = {
  version: '1.0.0',
  sites: {
    'chat.openai.com': {
      name: 'ChatGPT',
      enabled: true,
      inputSelectors: ['#prompt-textarea', "textarea[placeholder*='Message']"],
      submitSelectors: ["button[data-testid='send-button']", 'form button[type=submit]'],
    },
  },
};

describe('validateSelectorConfig', () => {
  it('accepts a well-formed config', () => {
    const result = validateSelectorConfig(validConfig);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags an enabled site with no input selectors', () => {
    const cfg = structuredClone(validConfig);
    cfg.sites['chat.openai.com'].inputSelectors = [];
    const result = validateSelectorConfig(cfg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /input selector/i.test(e))).toBe(true);
  });

  it('flags an enabled site with no submit selectors', () => {
    const cfg = structuredClone(validConfig);
    cfg.sites['chat.openai.com'].submitSelectors = [];
    const result = validateSelectorConfig(cfg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /submit selector/i.test(e))).toBe(true);
  });

  it('flags empty or whitespace-only selector strings', () => {
    const cfg = structuredClone(validConfig);
    cfg.sites['chat.openai.com'].inputSelectors = ['#prompt-textarea', '   '];
    const result = validateSelectorConfig(cfg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /empty selector/i.test(e))).toBe(true);
  });

  it('flags duplicate selectors within a list', () => {
    const cfg = structuredClone(validConfig);
    cfg.sites['chat.openai.com'].inputSelectors = ['#prompt-textarea', '#prompt-textarea'];
    const result = validateSelectorConfig(cfg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /duplicate/i.test(e))).toBe(true);
  });

  it('warns (not errors) when a fallback chain is shallow (<2 deep)', () => {
    const cfg = structuredClone(validConfig);
    cfg.sites['chat.openai.com'].submitSelectors = ["button[data-testid='send-button']"];
    const result = validateSelectorConfig(cfg);
    expect(result.ok).toBe(true); // single selector is allowed, just not resilient
    expect(result.warnings.some((w) => /fallback/i.test(w))).toBe(true);
  });

  it('ignores disabled sites', () => {
    const cfg = structuredClone(validConfig);
    cfg.sites['chat.openai.com'].enabled = false;
    cfg.sites['chat.openai.com'].inputSelectors = [];
    cfg.sites['chat.openai.com'].submitSelectors = [];
    const result = validateSelectorConfig(cfg);
    expect(result.ok).toBe(true);
  });

  it('flags a config with no sites', () => {
    const result = validateSelectorConfig({ version: '1.0.0', sites: {} });
    expect(result.ok).toBe(false);
  });

  it('the shipped configs/selectors.json is structurally valid', () => {
    const path = join(__dirname, '../../configs/selectors.json');
    const config = JSON.parse(readFileSync(path, 'utf-8').replace(/^﻿/, ''));
    const result = validateSelectorConfig(config);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
