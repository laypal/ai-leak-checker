/**
 * @file content-site-exclusion.test.ts
 * @description Verifies the content-script scan gate: when the current host is
 * in siteAllowlist, scanning is short-circuited to an empty result so no modal
 * fires. Mirrors the production glue (scanWithSettings) while using the real
 * isHostExcluded helper and real engine. Also locks the paused-badge notify
 * (SET_PAUSED_BADGE) and GET_SITE reply contract.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { scan } from '@/shared/detectors';
import { isHostExcluded } from '@/shared/utils/site-match';
import { MessageType, type DetectionResult } from '@/shared/types';

// Mirror of production scanWithSettings gate (src/content/index.ts).
function simulateScanWithSettings(
  text: string,
  host: string,
  siteAllowlist: string[]
): DetectionResult {
  if (isHostExcluded(host, siteAllowlist)) {
    return scan('');
  }
  return scan(text);
}

// Mirror of production notifyPausedState (src/content/index.ts): sends
// SET_PAUSED_BADGE with the paused state derived from the current settings.
function simulateNotifyPausedState(
  settings: { siteAllowlist: string[] },
  host: string,
  onSend: (message: { type: string; payload: unknown }) => void
): void {
  onSend({
    type: MessageType.SET_PAUSED_BADGE,
    payload: { paused: isHostExcluded(host, settings.siteAllowlist) },
  });
}

// Mirror of production GET_SITE handler case: replies with the page hostname.
function simulateHandleGetSite(
  hostname: string,
  sendResponse: (response?: unknown) => void
): boolean {
  sendResponse({ host: hostname });
  return true;
}

const SECRET = 'My key is sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD';

describe('content scan gate (siteAllowlist)', () => {
  it('returns no sensitive data when the host is excluded', () => {
    const result = simulateScanWithSettings(SECRET, 'chatgpt.com', ['chatgpt.com']);
    expect(result.hasSensitiveData).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('detects normally when the host is NOT excluded', () => {
    const result = simulateScanWithSettings(SECRET, 'chatgpt.com', []);
    expect(result.hasSensitiveData).toBe(true);
  });

  it('engages live after the host is added to the allowlist', () => {
    let allowlist: string[] = [];
    expect(simulateScanWithSettings(SECRET, 'claude.ai', allowlist).hasSensitiveData).toBe(true);
    allowlist = ['claude.ai']; // mirrors applySettings({ siteAllowlist:[host] })
    expect(simulateScanWithSettings(SECRET, 'claude.ai', allowlist).hasSensitiveData).toBe(false);
  });
});

describe('content paused-badge notify + GET_SITE (siteAllowlist)', () => {
  it('after applySettings({ siteAllowlist: [host] }) the next scan is empty AND SET_PAUSED_BADGE is sent', () => {
    const host = 'chatgpt.com';
    let settings = { siteAllowlist: [] as string[] };
    const sent: { type: string; payload: unknown }[] = [];

    // Live toggle: applySettings({ siteAllowlist: [host] }), then scan again.
    settings = { siteAllowlist: ['chatgpt.com'] };
    expect(simulateScanWithSettings(SECRET, host, settings.siteAllowlist).hasSensitiveData).toBe(false);

    // The content script notifies the background of the new paused state.
    simulateNotifyPausedState(settings, host, (m) => sent.push(m));
    expect(sent).toEqual([
      { type: MessageType.SET_PAUSED_BADGE, payload: { paused: true } },
    ]);
  });

  it('sends SET_PAUSED_BADGE with paused=false when the host is not allowlisted', () => {
    const sent: { type: string; payload: unknown }[] = [];
    simulateNotifyPausedState({ siteAllowlist: [] }, 'chatgpt.com', (m) => sent.push(m));
    expect(sent).toEqual([
      { type: MessageType.SET_PAUSED_BADGE, payload: { paused: false } },
    ]);
  });

  it('GET_SITE reply carries the current hostname', () => {
    let reply: unknown;
    const returned = simulateHandleGetSite('chatgpt.com', (r) => {
      reply = r;
    });
    expect(returned).toBe(true);
    expect(reply).toEqual({ host: 'chatgpt.com' });
  });
});
