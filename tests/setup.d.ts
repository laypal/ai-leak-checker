/**
 * Test setup for Vitest.
 * Runs before each test file.
 */
declare const mockStorage: Record<string, unknown>;
declare const storageMock: {
    local: {
        get: import("vitest").Mock<[keys: string | string[] | null], Promise<{
            [x: string]: unknown;
        }>>;
        set: import("vitest").Mock<[items: Record<string, unknown>], Promise<void>>;
        remove: import("vitest").Mock<[keys: string | string[]], Promise<void>>;
        clear: import("vitest").Mock<[], Promise<void>>;
    };
    sync: {
        get: import("vitest").Mock<[], Promise<{}>>;
        set: import("vitest").Mock<[], Promise<void>>;
    };
    onChanged: {
        addListener: import("vitest").Mock<any, any>;
        removeListener: import("vitest").Mock<any, any>;
    };
};
declare const runtimeMock: {
    sendMessage: import("vitest").Mock<[], Promise<void>>;
    onMessage: {
        addListener: import("vitest").Mock<any, any>;
        removeListener: import("vitest").Mock<any, any>;
    };
    getURL: import("vitest").Mock<[path: string], string>;
    id: string;
};
declare const actionMock: {
    setBadgeText: import("vitest").Mock<[], Promise<void>>;
    setBadgeBackgroundColor: import("vitest").Mock<[], Promise<void>>;
    setIcon: import("vitest").Mock<[], Promise<void>>;
};
declare const tabsMock: {
    query: import("vitest").Mock<[], Promise<never[]>>;
    sendMessage: import("vitest").Mock<[], Promise<void>>;
    onUpdated: {
        addListener: import("vitest").Mock<any, any>;
        removeListener: import("vitest").Mock<any, any>;
    };
};
export { mockStorage, storageMock, runtimeMock, actionMock, tabsMock };
//# sourceMappingURL=setup.d.ts.map