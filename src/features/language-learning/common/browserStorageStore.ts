const STORAGE_CHANGE_EVENT = "translacat:language-learning:storage-change";

type StorageValue = string | null;
type StorageUpdate = StorageValue | ((current: StorageValue) => StorageValue);

interface StorageChange {
    key: string;
    value: StorageValue;
    persisted: boolean;
}

/**
 * A string snapshot keeps useSyncExternalStore stable between reads. Storage is
 * accessed only in the browser, never while creating the store on the server.
 * Failed writes remain usable in memory for the lifetime of this store.
 */
export function createBrowserStorageStore(storageKey: string | null) {
    let fallback: { value: StorageValue } | null = null;

    const getSnapshot = (): StorageValue => {
        if (storageKey === null || typeof window === "undefined") return null;
        if (fallback !== null) return fallback.value;
        try {
            return window.localStorage.getItem(storageKey);
        } catch {
            return null;
        }
    };

    const subscribe = (onStoreChange: () => void) => {
        if (storageKey === null || typeof window === "undefined") return () => {};

        const onStorage = (event: StorageEvent) => {
            if (event.key !== null && event.key !== storageKey) return;
            try {
                if (event.storageArea !== window.localStorage) return;
            } catch {
                return;
            }
            fallback = null;
            onStoreChange();
        };
        const onLocalChange = (event: Event) => {
            const change = (event as CustomEvent<StorageChange>).detail;
            if (change?.key !== storageKey || typeof change.persisted !== "boolean"
                || (change.value !== null && typeof change.value !== "string")) return;
            fallback = change.persisted ? null : { value: change.value };
            onStoreChange();
        };

        window.addEventListener("storage", onStorage);
        window.addEventListener(STORAGE_CHANGE_EVENT, onLocalChange);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(STORAGE_CHANGE_EVENT, onLocalChange);
        };
    };

    const setValue = (update: StorageUpdate) => {
        if (storageKey === null || typeof window === "undefined") return;
        const current = getSnapshot();
        const value = typeof update === "function" ? update(current) : update;
        if (value === current) return;

        let persisted = false;
        try {
            if (value === null) window.localStorage.removeItem(storageKey);
            else window.localStorage.setItem(storageKey, value);
            fallback = null;
            persisted = true;
        } catch {
            // Private browsing/quota failures must not disable editing or toggles.
            fallback = { value };
        }
        // Native storage events are only sent to *other* documents. Notify this
        // document too, including other mounted consumers of the same key.
        window.dispatchEvent(new CustomEvent<StorageChange>(STORAGE_CHANGE_EVENT, {
            detail: { key: storageKey, value, persisted },
        }));
    };

    return { getSnapshot, subscribe, setValue };
}

/** SSR and the first hydration render must use the same snapshot. */
export function getServerStorageSnapshot(): null {
    return null;
}
