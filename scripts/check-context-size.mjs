#!/usr/bin/env node
/**
 * @file check-context-size.mjs
 * @description Warns when a context file (one agents load to orient) passes
 *   the 400-line rule in .claude/rules/tasks.md. Runs as a Claude Code
 *   PostToolUse hook on Write/Edit (reads the tool input from stdin) or by
 *   hand with no stdin, in which case it scans every watched path.
 *   Exit 2 puts the message in front of the model; it never blocks the edit.
 */
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const LIMIT = 400;
const ROOT = process.cwd();
const WATCH = [
  'CLAUDE.md', 'AGENTS.md', 'OPENCODE-DEV.md', 'STACK.md', 'ERRORS.md',
  'docs/STATUS.md', 'docs/tasks', '.claude/rules', '.claude/agents',
  '.opencode/agents',
];
const EXEMPT = ['docs/tasks/completed'];

function watched(rel) {
  const p = rel.split(sep).join('/');
  if (EXEMPT.some((e) => p.startsWith(e))) return false;
  return WATCH.some((w) => p === w || p.startsWith(w + '/'));
}

function lines(file) {
  return readFileSync(file, 'utf8').split(/\r?\n/).length;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.md')) yield full;
  }
}

function check(file) {
  const rel = relative(ROOT, file);
  if (!rel.endsWith('.md') || !watched(rel)) return null;
  const n = lines(file);
  return n > LIMIT ? `${rel} is ${n} lines, past the ${LIMIT}-line context-file rule (.claude/rules/tasks.md). Split it.` : null;
}

let input = '';
try { if (!process.stdin.isTTY) input = readFileSync(0, 'utf8'); } catch { /* no stdin */ }

const warnings = [];
if (input.trim()) {
  const file = JSON.parse(input)?.tool_input?.file_path;
  if (file) { try { statSync(file); const w = check(file); if (w) warnings.push(w); } catch { /* not a file */ } }
} else {
  for (const w of WATCH) {
    const full = join(ROOT, w);
    let st; try { st = statSync(full); } catch { continue; }
    const files = st.isDirectory() ? [...walk(full)] : [full];
    for (const f of files) { const msg = check(f); if (msg) warnings.push(msg); }
  }
}

if (warnings.length) { process.stderr.write(warnings.join('\n') + '\n'); process.exit(2); }
