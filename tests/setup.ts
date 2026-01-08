/**
 * Test setup for Vitest.
 * Runs before each test file.
 */

import { vi } from 'vitest';

// Mock chrome.storage API for unit tests
const mockStorage: Record<string, unknown> = {};

const storageMock = {
  local: {
    get: vi.fn((keys: string | string[] | null) => {
      if (keys === null) {
        return Promise.resolve({ ...mockStorage });
      }
      const keyList = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        if (key in mockStorage) {
          result[key] = mockStorage[key];
        }
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(mockStorage, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const key of keyList) {
        delete mockStorage[key];
      }
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      return Promise.resolve();
    }),
  },
  sync: {
    get: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve()),
  },
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Mock chrome.runtime API
const runtimeMock = {
  sendMessage: vi.fn(() => Promise.resolve()),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  id: 'mock-extension-id',
};

// Mock chrome.action API (badge)
const actionMock = {
  setBadgeText: vi.fn(() => Promise.resolve()),
  setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  setIcon: vi.fn(() => Promise.resolve()),
};

// Mock chrome.tabs API
const tabsMock = {
  query: vi.fn(() => Promise.resolve([])),
  sendMessage: vi.fn(() => Promise.resolve()),
  onUpdated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Assign to global
globalThis.chrome = {
  storage: storageMock,
  runtime: runtimeMock,
  action: actionMock,
  tabs: tabsMock,
} as unknown as typeof chrome;

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});

// Export for use in tests
export { mockStorage, storageMock, runtimeMock, actionMock, tabsMock };
