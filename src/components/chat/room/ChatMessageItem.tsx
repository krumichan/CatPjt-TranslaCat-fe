"use client";

import { Bot, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import { ChatTranslationBlock } from "@/components/chat/room/ChatTranslationBlock";
import type {
    ChatAiDisclosureType,
    ChatLanguageSettings,
    ChatMessage,
} from "@/types/chat";
import { shouldShowOriginalMessageContent } from "@/utils/chat/chatTranslations";

interface ChatMessageItemProps {
    message: ChatMessage;
    isMine: boolean;
    isOpenRoom: boolean;
    aiDisclosureType: ChatAiDisclosureType | null;
    languageSettings: ChatLanguageSettings | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
    onOpenSenderProfile?: () => void;
    onOpenAiSenderProfile?: () => void;
    onRetryTranslation: (
        messageId: number,
        languageCode: string,
    ) => Promise<boolean>;
    onRefreshMessages: () => Promise<void>;
}

function formatMessageTime(value: string, locale: string) {
    try {
        return new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value));
    } catch {
        return "";
    }
}

interface ChatSenderAvatarProps {
    messageId: number;
    isOpenRoom: boolean;
    displayName: string;
    profileImageUrl: string | null;
    onOpenProfile?: () => void;
    openProfileLabel: string;
}

function ChatSenderAvatar({
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

export function ChatMessageItem({
    message,
    isMine,
    isOpenRoom,
    aiDisclosureType,
    languageSettings,
    retryingTranslationKeys,
    retryTranslationErrorKeys,
    onOpenSenderProfile,
    onOpenAiSenderProfile,
    onRetryTranslation,
    onRefreshMessages,
}: ChatMessageItemProps) {
    const locale = useLocale();
    const tMemberProfile = useTranslations("ChatRoom.memberProfile");
    const tReadStatus = useTranslations("ChatRoom.readStatus");
    const tAiMessage = useTranslations("ChatAi.message");
    const showOriginalContent = shouldShowOriginalMessageContent(
        message.translations,
        languageSettings,
    );
    const messageTime = formatMessageTime(message.createdAt, locale);
    const isAiMessage = message.senderType === "AI";
    const showAiBadge = isAiMessage && aiDisclosureType === "PUBLIC";
    const showSenderProfile =
        !isMine &&
        (message.senderType === "USER" || message.senderType === "AI");
    const openSender =
        !isAiMessage && isOpenRoom ? message.sender ?? null : null;
    const senderDisplayName = isAiMessage
        ? message.senderName ?? tAiMessage("unknownName")
        : isOpenRoom
          ? openSender?.nickname ?? tMemberProfile("unknownUser")
          : message.senderName ?? tMemberProfile("unknownUser");
    const senderProfileImageUrl = isAiMessage
        ? message.senderProfileImageUrl
        : isOpenRoom
          ? openSender?.profileImageUrl ?? null
          : message.senderProfileImageUrl;
    const openProfileAction = isAiMessage
        ? onOpenAiSenderProfile
        : onOpenSenderProfile;
    const unreadMemberCount =
        typeof message.unreadMemberCount === "number"
            ? message.unreadMemberCount
            : 0;
    const showUnreadMemberCount =
        message.senderType !== "SYSTEM" &&
        message.messageType !== "SYSTEM" &&
        unreadMemberCount > 0;

    return (
        <div
            data-testid={
                isAiMessage ? `chat-ai-message-${message.id}` : undefined
            }
            className={`flex w-full items-start gap-2 ${
                isMine ? "justify-end" : "justify-start"
            }`}
        >
            {showSenderProfile && (
                <ChatSenderAvatar
                    messageId={message.id}
                    isOpenRoom={isOpenRoom}
                    displayName={senderDisplayName}
                    profileImageUrl={senderProfileImageUrl}
                    onOpenProfile={openProfileAction}
                    openProfileLabel={tMemberProfile("openProfile", {
                        nickname: senderDisplayName,
                    })}
                />
            )}

            <div
                className={`flex min-w-0 flex-1 flex-col ${
                    isMine ? "items-end" : "items-start"
                }`}
            >
                {!isMine && (
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>{senderDisplayName}</span>
                        {showAiBadge && (
                            <span
                                data-testid={`chat-ai-badge-${message.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-black text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200"
                            >
                                <Bot className="h-2.5 w-2.5" aria-hidden="true" />
                                {tAiMessage("badge")}
                            </span>
                        )}
                        {openSender && openSender.role !== "MEMBER" && (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-black text-orange-700 dark:bg-orange-400/15 dark:text-orange-200">
                                {tMemberProfile(`roles.${openSender.role}`)}
                            </span>
                        )}
                    </div>
                )}

                <div
                    className={`flex max-w-[86%] items-end gap-2 ${
                        isMine ? "flex-row-reverse" : "flex-row"
                    }`}
                >
                    <div
                        data-testid={`chat-message-bubble-${message.id}`}
                        className={`max-w-full rounded-3xl px-4 py-3 shadow-sm ${
                            isMine
                                ? "rounded-br-md bg-blue-600 text-white"
                                : "rounded-bl-md bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                        }`}
                    >
                        {showOriginalContent && (
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {message.content}
                            </p>
                        )}

                        <ChatTranslationBlock
                            messageId={message.id}
                            translations={message.translations}
                            isMine={isMine}
                            languageSettings={languageSettings}
                            retryingTranslationKeys={retryingTranslationKeys}
                            retryTranslationErrorKeys={
                                retryTranslationErrorKeys
                            }
                            onRetryTranslation={onRetryTranslation}
                            onRefreshMessages={onRefreshMessages}
                        />
                    </div>

                    {(showUnreadMemberCount || messageTime) && (
                        <div
                            className={`mb-1 flex shrink-0 flex-col gap-0.5 ${
                                isMine ? "items-end" : "items-start"
                            }`}
                        >
                            {showUnreadMemberCount && (
                                <span
                                    data-testid={`chat-message-unread-count-${message.id}`}
                                    aria-label={tReadStatus("unreadMembers", {
                                        count: unreadMemberCount,
                                    })}
                                    className="text-[11px] font-bold leading-none text-amber-500 dark:text-amber-300"
                                >
                                    {unreadMemberCount}
                                </span>
                            )}

                            {messageTime && (
                                <time
                                    dateTime={message.createdAt}
                                    className="text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                                >
                                    {messageTime}
                                </time>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
