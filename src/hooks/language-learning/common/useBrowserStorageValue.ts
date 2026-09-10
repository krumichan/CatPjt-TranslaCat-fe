"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
    createBrowserStorageStore,
    getServerStorageSnapshot,
} from "@/features/language-learning/common/browserStorageStore";

export function useBrowserStorageValue(storageKey: string | null) {
    const store = useMemo(() => createBrowserStorageStore(storageKey), [storageKey]);
    const value = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        getServerStorageSnapshot,
    );
    return [value, store.setValue] as const;
}
