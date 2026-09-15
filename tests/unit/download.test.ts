/**
 * @file download.test.ts
 * @description Tests for the popup's browser-download helper.
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { downloadTextFile } from '@/popup/download';

describe('downloadTextFile', () => {
  const FAKE_URL = 'blob:fake-url';

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => FAKE_URL);
    URL.revokeObjectURL = vi.fn();
  });

  test('creates a blob URL, triggers a click, and revokes it', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    let createdAnchor: HTMLAnchorElement | undefined;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') createdAnchor = el as HTMLAnchorElement;
        return el;
      });

    downloadTextFile('a,b\n1,2', 'stats.csv');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(FAKE_URL);
    expect(createdAnchor?.download).toBe('stats.csv');

    clickSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});
