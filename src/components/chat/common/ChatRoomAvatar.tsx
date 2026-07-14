"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";

interface ChatRoomAvatarProps {
    profileImageUrl: string | null;
    alt: string;
    size?: "md" | "lg";
}

const sizeClassNames = {
    md: "h-10 w-10 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
} as const;

const iconSizeClassNames = {
    md: "h-5 w-5",
    lg: "h-6 w-6",
} as const;

export function ChatRoomAvatar({
    profileImageUrl,
    alt,
    size = "md",
}: ChatRoomAvatarProps) {
    const normalizedProfileImageUrl = profileImageUrl?.trim() || null;
    const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
    const shouldShowImage =
        normalizedProfileImageUrl !== null &&
        failedImageUrl !== normalizedProfileImageUrl;

    return (
        <div
            data-testid="friend-direct-avatar"
            className={`relative shrink-0 overflow-hidden border border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300 ${sizeClassNames[size]}`}
        >
            {shouldShowImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={normalizedProfileImageUrl}
                    alt={alt}
                    className="h-full w-full object-cover"
                    onError={() =>
                        setFailedImageUrl(normalizedProfileImageUrl)
                    }
                />
            ) : (
                <span
                    role="img"
                    aria-label={alt}
                    className="flex h-full w-full items-center justify-center"
                >
                    <UserRound
                        className={iconSizeClassNames[size]}
                        aria-hidden="true"
                    />
                </span>
            )}
        </div>
    );
}
