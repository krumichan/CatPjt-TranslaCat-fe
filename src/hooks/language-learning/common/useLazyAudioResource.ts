"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { createLazyAudioResource } from "@/features/language-learning/common/lazyAudioResource";

interface UseLazyAudioResourceOptions {
    resourceId: number;
    fetcher: (resourceId: number) => Promise<Blob>;
    enabled?: boolean;
}

/** Owns lazy audio state and object URLs for one identity and availability window. */
export function useLazyAudioResource({ resourceId, fetcher, enabled = true }: UseLazyAudioResourceOptions) {
    const resource = useMemo(
        () => createLazyAudioResource({ fetchBlob: () => fetcher(resourceId) }),
        [fetcher, resourceId],
    );
    const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getServerSnapshot);

    useEffect(() => {
        if (!enabled) return;
        return resource.activate();
    }, [enabled, resource]);

    return { ...snapshot, load: resource.load };
}
