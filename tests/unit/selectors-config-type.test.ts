/**
 * @file selectors-config-type.test.ts
 * @description EXT-TYPE-DRIFT regression: proves configs/selectors.json conforms
 * to an accurate TypeScript model with no casts, and that the file's $schema
 * reference points at a schema that actually exists on disk.
 * @module tests/unit/selectors-config-type
 *
 * @dependencies
 * - vitest (describe, it, expect)
 * - @/shared/types/selectors (SelectorConfigFile)
 * - configs/selectors.json (typed import)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SelectorConfigFile } from '@/shared/types/selectors';
import { validateSelectorConfig } from '@/shared/utils/selector-validation';
import selectorsJson from '../../configs/selectors.json';

const CONFIG_DIR = join(__dirname, '../../configs');

/** Narrow unknown parsed JSON to an object having a string-valued `key`. */
function hasStringField<K extends string>(obj: unknown, key: K): obj is Record<K, string> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>)[key] === 'string'
  );
}

describe('selectors.json type conformance (EXT-TYPE-DRIFT)', () => {
  it('type-checks as SelectorConfigFile with no casts', () => {
    // Compile-time conformance: if the JSON shape and the type drift apart,
    // this assignment fails `npm run typecheck`. The runtime assertions below
    // keep the case meaningful at test time too.
    const config: SelectorConfigFile = selectorsJson;
    expect(config.version).toBeTypeOf('string');
    expect(config.sites).toBeTypeOf('object');
  });

  it('models plural containerSelectors and structured bodyExtractor', () => {
    const config: SelectorConfigFile = selectorsJson;
    const chatgpt = config.sites['chat.openai.com'];
    expect(Array.isArray(chatgpt?.containerSelectors)).toBe(true);
    expect(chatgpt?.bodyExtractor.type).toBe('json');
    expect(chatgpt?.bodyExtractor.path).toBeTypeOf('string');
  });

  it('passes structural validation', () => {
    expect(validateSelectorConfig(selectorsJson).ok).toBe(true);
  });

  it('has a $schema reference that resolves to an existing schema file', () => {
    // selectorsJson's type already carries $schema (resolveJsonModule), so no
    // cast is needed; assert it's a string before using it.
    const schemaRef = selectorsJson.$schema;
    expect(schemaRef).toBeTypeOf('string');
    if (typeof schemaRef !== 'string') return;
    const resolved = join(CONFIG_DIR, schemaRef.replace(/^\.\//, ''));
    expect(existsSync(resolved)).toBe(true);
  });

  it('ships a JSON Schema that is itself valid JSON with the expected $id-less draft', () => {
    const schemaRaw = readFileSync(join(CONFIG_DIR, 'selectors.schema.json'), 'utf-8');
    const schema: unknown = JSON.parse(schemaRaw);
    expect(hasStringField(schema, 'type')).toBe(true);
    expect(hasStringField(schema, '$schema')).toBe(true);
    if (!hasStringField(schema, 'type') || !hasStringField(schema, '$schema')) return;
    expect(schema.type).toBe('object');
    expect(schema.$schema).toContain('json-schema.org');
  });
});
