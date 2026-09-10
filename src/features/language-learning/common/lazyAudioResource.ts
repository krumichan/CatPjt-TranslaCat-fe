export interface LazyAudioSnapshot {
    readonly url: string | null;
    readonly loading: boolean;
    readonly failed: boolean;
}

interface LazyAudioResourceOptions {
    fetchBlob: () => Promise<Blob>;
    createObjectURL?: (blob: Blob) => string;
    revokeObjectURL?: (url: string) => void;
}

const EMPTY_SNAPSHOT: LazyAudioSnapshot = { url: null, loading: false, failed: false };

/** A component-scoped resource. Creation is inert; activation belongs to the hook's effect. */
export function createLazyAudioResource({
    fetchBlob,
    createObjectURL = (blob) => URL.createObjectURL(blob),
    revokeObjectURL = (url) => URL.revokeObjectURL(url),
}: LazyAudioResourceOptions) {
    let snapshot = EMPTY_SNAPSHOT;
    let active = false;
    let generation = 0;
    let pending: Promise<void> | null = null;
    const listeners = new Set<() => void>();

    const update = (next: LazyAudioSnapshot) => {
        snapshot = next;
        listeners.forEach((listener) => listener());
    };

    const deactivate = () => {
        active = false;
        generation += 1;
        pending = null;
        const previousUrl = snapshot.url;
        snapshot = EMPTY_SNAPSHOT;
        if (previousUrl) revokeObjectURL(previousUrl);
        listeners.forEach((listener) => listener());
    };

    const load = (): Promise<void> => {
        if (!active || snapshot.url) return Promise.resolve();
        if (pending) return pending;
        const requestGeneration = ++generation;
        const isCurrent = () => active && generation === requestGeneration;
        update({ url: null, loading: true, failed: false });
        // Schedule the fetch after pending is assigned, including synchronously throwing fetchers.
        pending = Promise.resolve()
            .then(() => isCurrent() ? fetchBlob() : null)
            .then((blob) => {
                if (!blob || !isCurrent()) return;
                const url = createObjectURL(blob);
                update({ url, loading: false, failed: false });
            })
            .catch(() => {
                if (isCurrent()) update({ url: null, loading: false, failed: true });
            })
            .finally(() => {
                if (isCurrent()) pending = null;
            });
        return pending;
    };

    return {
        getSnapshot: () => snapshot,
        getServerSnapshot: () => EMPTY_SNAPSHOT,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        activate: () => {
            active = true;
            return deactivate;
        },
        load,
    };
}
