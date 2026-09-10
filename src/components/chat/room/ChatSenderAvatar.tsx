"use client";

import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import { UserRound } from "lucide-react";

interface ChatSenderAvatarProps {
    messageId: number;
    isOpenRoom: boolean;
    displayName: string;
    profileImageUrl: string | null;
    onOpenProfile?: () => void;
    openProfileLabel: string;
}

export function ChatSenderAvatar({
    messageId,
    isOpenRoom,
    displayName,
    profileImageUrl,
    onOpenProfile,
    openProfileLabel,
}: ChatSenderAvatarProps) {
    const content = isOpenRoom ? (
        <OpenChatAvatar
            profileImageUrl={profileImageUrl}
            alt={displayName}
            size="sm"
        />
    ) : (
        <>
            <UserRound className="h-5 w-5" aria-hidden="true" />
            {profileImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={profileImageUrl}
                    alt={displayName}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    onError={(event) => {
                        event.currentTarget.style.display = "none";
                    }}
                />
            )}
        </>
    );

    const className =
        "relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500 ring-1 ring-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:ring-white/10";

    if (!onOpenProfile) {
        return (
            <div
                data-testid={`chat-message-avatar-${messageId}`}
                aria-label={displayName}
                className={className}
            >
                {content}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onOpenProfile}
            data-testid={`chat-message-avatar-${messageId}`}
            aria-label={openProfileLabel}
            className={`${className} cursor-pointer transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
        >
            {content}
        </button>
    );
}
