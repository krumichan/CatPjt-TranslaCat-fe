"use client";

import type { ReactNode } from "react";

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
