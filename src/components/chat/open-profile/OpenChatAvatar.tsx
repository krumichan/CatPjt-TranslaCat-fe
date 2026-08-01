"use client";

import { Cat } from "lucide-react";

interface OpenChatAvatarProps {
    profileImageUrl: string | null;
    alt: string;
    size?: "sm" | "md" | "lg";
    testId?: string;
}

const SIZE_CLASS = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-28 w-28",
} as const;

const ICON_CLASS = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-12 w-12",
} as const;

export function OpenChatAvatar({
    profileImageUrl,
    alt,
    size = "md",
    testId,
}: OpenChatAvatarProps) {
    return (
        <div
            data-testid={testId}
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-amber-300 text-white ring-1 ring-orange-200 dark:ring-orange-400/30 ${SIZE_CLASS[size]}`}
        >
            <Cat
                className={ICON_CLASS[size]}
                aria-hidden="true"
            />

            {profileImageUrl && (
                // Storage custom domain and blob preview are both supported.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={profileImageUrl}
                    alt={alt}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    onError={(event) => {
                        event.currentTarget.style.display = "none";
                    }}
                />
            )}
        </div>
    );
}
