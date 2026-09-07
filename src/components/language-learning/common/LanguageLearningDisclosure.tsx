"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

type DisclosureMap = Record<string, boolean>;

export interface DisclosureControlProps {
    isOpen: boolean;
    onToggle: () => void;
    expandLabel: string;
    collapseLabel: string;
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
    const [state, setState] = useState<Record<T, boolean>>(desktopDefaults);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        let nextState = window.matchMedia(MOBILE_QUERY).matches
            ? mobileDefaults
            : desktopDefaults;

        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const saved = JSON.parse(raw) as DisclosureMap;
                nextState = Object.keys(desktopDefaults).reduce(
                    (acc, key) => {
                        const typedKey = key as T;
                        acc[typedKey] = typeof saved[key] === "boolean"
                            ? saved[key]
                            : nextState[typedKey];
                        return acc;
                    },
                    {} as Record<T, boolean>,
                );
            }
        } catch {
            // Ignore malformed or unavailable localStorage and keep responsive defaults.
        }

        setState(nextState);
        setInitialized(true);
    }, [desktopDefaults, mobileDefaults, storageKey]);

    useEffect(() => {
        if (!initialized) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
            // The disclosure UX must keep working even when storage is unavailable.
        }
    }, [initialized, state, storageKey]);

    const toggle = useCallback((key: T) => {
        setState((current) => ({ ...current, [key]: !current[key] }));
    }, []);

    const setOpen = useCallback((key: T, open: boolean) => {
        setState((current) => ({ ...current, [key]: open }));
    }, []);

    const setAll = useCallback((open: boolean) => {
        setState((current) => Object.keys(current).reduce(
            (acc, key) => {
                acc[key as T] = open;
                return acc;
            },
            {} as Record<T, boolean>,
        ));
    }, []);

    const allOpen = useMemo(
        () => Object.values(state).every(Boolean),
        [state],
    );

    return { state, toggle, setOpen, setAll, allOpen };
}

export function DisclosureToggleButton({
    isOpen,
    onToggle,
    expandLabel,
    collapseLabel,
    controls,
    compact = false,
}: {
    isOpen: boolean;
    onToggle: () => void;
    expandLabel: string;
    collapseLabel: string;
    controls?: string;
    compact?: boolean;
}) {
    return (
        <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={controls}
            onClick={onToggle}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white font-black text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 ${
                compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
            }`}
        >
            <span>{isOpen ? collapseLabel : expandLabel}</span>
            <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
            />
        </button>
    );
}

export function DisclosureAllButton({
    allOpen,
    onSetAll,
    expandAllLabel,
    collapseAllLabel,
}: {
    allOpen: boolean;
    onSetAll: (open: boolean) => void;
    expandAllLabel: string;
    collapseAllLabel: string;
}) {
    return (
        <button
            type="button"
            onClick={() => onSetAll(!allOpen)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
        >
            {allOpen ? collapseAllLabel : expandAllLabel}
        </button>
    );
}

export function DisclosureContent({
    id,
    isOpen,
    children,
    className = "",
}: {
    id?: string;
    isOpen: boolean;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            id={id}
            aria-hidden={!isOpen}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                isOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
            }`}
        >
            <div className="min-h-0 overflow-hidden">
                <div className={className}>{children}</div>
            </div>
        </div>
    );
}
