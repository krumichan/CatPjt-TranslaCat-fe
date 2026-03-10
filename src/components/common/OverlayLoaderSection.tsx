"use client";

import React from "react";
import clsx from "clsx";

export default function OverlayLoaderSection({
    isLoading,
    children,
}: {
    isLoading: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className={clsx(
                "transition-all duration-300",
                isLoading && "blur-md opacity-70 pointer-events-none"
            )}
        >
            {children}
        </div>
    );
}