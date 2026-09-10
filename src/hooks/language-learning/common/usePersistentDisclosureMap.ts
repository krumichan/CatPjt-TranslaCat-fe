"use client";

import { resolveDisclosureState } from "@/features/language-learning/common/disclosureState";
import { useBrowserStorageValue } from "@/hooks/language-learning/common/useBrowserStorageValue";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToViewport(onStoreChange: () => void) {
    const media = window.matchMedia(MOBILE_QUERY);
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot() {
    return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerMobileSnapshot() {
    return false;
}

export function usePersistentDisclosureMap<T extends string>({
    storageKey,
    desktopDefaults,
    mobileDefaults = desktopDefaults,
}: {
    storageKey: string;
    desktopDefaults: Record<T, boolean>;
    mobileDefaults?: Record<T, boolean>;
}) {
    const [raw, setStoredValue] = useBrowserStorageValue(storageKey);
    const isMobile = useSyncExternalStore(
        subscribeToViewport,
        getMobileSnapshot,
        getServerMobileSnapshot,
    );
    const defaults = isMobile ? mobileDefaults : desktopDefaults;
    const state = useMemo(() => resolveDisclosureState(defaults, raw), [defaults, raw]);

    const updateState = useCallback((update: (current: Record<T, boolean>) => Record<T, boolean>) => {
        setStoredValue((current) => {
            // An effect opening a hash target may run before the hydration
            // snapshot updates. Read the actual viewport at interaction time.
            const currentDefaults = getMobileSnapshot() ? mobileDefaults : desktopDefaults;
            return JSON.stringify(update(resolveDisclosureState(currentDefaults, current)));
        });
    }, [desktopDefaults, mobileDefaults, setStoredValue]);

    const toggle = useCallback((key: T) => {
        updateState((current) => ({ ...current, [key]: !current[key] }));
    }, [updateState]);

    const setOpen = useCallback((key: T, open: boolean) => {
        updateState((current) => ({ ...current, [key]: open }));
    }, [updateState]);

    const setAll = useCallback((open: boolean) => {
        updateState((current) => Object.keys(current).reduce(
            (acc, key) => {
                acc[key as T] = open;
                return acc;
            },
            {} as Record<T, boolean>,
        ));
    }, [updateState]);

    const allOpen = useMemo(
        () => Object.values(state).every(Boolean),
        [state],
    );

    return { state, toggle, setOpen, setAll, allOpen };
}
