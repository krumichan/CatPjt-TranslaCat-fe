"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "translacat:app-sidebar-collapsed";
const CHANGE_EVENT = "translacat:app-sidebar-change";

function getSnapshot() {
    return (
        window.localStorage.getItem(STORAGE_KEY) === "true"
    );
}

function getServerSnapshot() {
    return false;
}

function subscribe(onStoreChange: () => void) {
    const handleStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) {
            onStoreChange();
        }
    };

    const handleLocalChange = () => {
        onStoreChange();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleLocalChange);

    return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
            CHANGE_EVENT,
            handleLocalChange,
        );
    };
}

export function useAppSidebarState() {
    const isCollapsed = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );

    const setCollapsed = useCallback((collapsed: boolean) => {
        window.localStorage.setItem(
            STORAGE_KEY,
            String(collapsed),
        );
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    const toggleCollapsed = useCallback(() => {
        setCollapsed(!getSnapshot());
    }, [setCollapsed]);

    return {
        isCollapsed,
        setCollapsed,
        toggleCollapsed,
    };
}
