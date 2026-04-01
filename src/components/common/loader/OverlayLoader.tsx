"use client";

import SpinLoader, { SpinnerProps } from "./SpinLoader";

interface OverlayLoaderProps extends SpinnerProps {
    blur?: boolean;
    containerClassName?: string;
}

export default function OverlayLoader({
    blur = true,
    containerClassName = "pt-20",
    ...spinnerProps
}: OverlayLoaderProps) {
    if (!spinnerProps.isLoading) return null;

    return (
        <div
            className={`absolute inset-0 z-10 flex items-start justify-center 
                        bg-white/30 dark:bg-black/20 rounded-3xl transition-all duration-300
                        ${blur ? "backdrop-blur-[6px]" : ""}
                        ${containerClassName}`}
        >
            <SpinLoader {...spinnerProps} />
        </div>
    );
}