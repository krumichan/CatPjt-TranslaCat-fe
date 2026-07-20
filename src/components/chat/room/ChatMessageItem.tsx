"use client";

import { UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ChatTranslationBlock } from "@/components/chat/room/ChatTranslationBlock";
import type { ChatLanguageSettings, ChatMessage } from "@/types/chat";
import { shouldShowOriginalMessageContent } from "@/utils/chat/chatTranslations";

interface ChatMessageItemProps {
    message: ChatMessage;
    isMine: boolean;
    languageSettings: ChatLanguageSettings | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
    onOpenSenderProfile?: () => void;
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

export function ChatMessageItem({
    message,
    isMine,
    languageSettings,
    retryingTranslationKeys,
    retryTranslationErrorKeys,
    onOpenSenderProfile,
    onRetryTranslation,
    onRefreshMessages,
}: ChatMessageItemProps) {
    const locale = useLocale();
    const tMemberProfile =
        useTranslations("ChatRoom.memberProfile");
    const showOriginalContent = shouldShowOriginalMessageContent(
        message.translations,
        languageSettings,
    );
    const messageTime = formatMessageTime(message.createdAt, locale);
    const showSenderProfile =
        !isMine && message.senderType === "USER";

    return (
        <div
            className={`flex w-full items-start gap-2 ${
                isMine ? "justify-end" : "justify-start"
            }`}
        >
            {showSenderProfile &&
                (onOpenSenderProfile ? (
                    <button
                        type="button"
                        onClick={onOpenSenderProfile}
                        data-testid={`chat-message-avatar-${message.id}`}
                        aria-label={tMemberProfile(
                            "openProfile",
                            {
                                nickname:
                                    message.senderName ??
                                    tMemberProfile(
                                        "unknownUser",
                                    ),
                            },
                        )}
                        className="relative mt-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500 ring-1 ring-slate-300 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 dark:bg-slate-700 dark:text-slate-300 dark:ring-white/10"
                    >
                        <UserRound
                            className="h-5 w-5"
                            aria-hidden="true"
                        />

                        {message.senderProfileImageUrl && (
                            // TODO: 실제 Storage custom domain 확정 후 next/image 적용 재검토
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={
                                    message.senderProfileImageUrl
                                }
                                alt={
                                    message.senderName ??
                                    ""
                                }
                                className="absolute inset-0 h-full w-full object-cover object-center"
                                onError={(event) => {
                                    event.currentTarget.style.display =
                                        "none";
                                }}
                            />
                        )}
                    </button>
                ) : (
                    <div
                        data-testid={`chat-message-avatar-${message.id}`}
                        aria-label={
                            message.senderName ??
                            "Unknown"
                        }
                        className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500 ring-1 ring-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:ring-white/10"
                    >
                        <UserRound
                            className="h-5 w-5"
                            aria-hidden="true"
                        />

                        {message.senderProfileImageUrl && (
                            // TODO: 실제 Storage custom domain 확정 후 next/image 적용 재검토
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={
                                    message.senderProfileImageUrl
                                }
                                alt={
                                    message.senderName ??
                                    ""
                                }
                                className="absolute inset-0 h-full w-full object-cover object-center"
                                onError={(event) => {
                                    event.currentTarget.style.display =
                                        "none";
                                }}
                            />
                        )}
                    </div>
                ))}

            <div
                className={`flex min-w-0 flex-1 flex-col ${
                    isMine ? "items-end" : "items-start"
                }`}
            >
                {!isMine && (
                    <p className="mb-1 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {message.senderName ?? "Unknown"}
                    </p>
                )}

                <div
                    className={`flex max-w-[86%] items-end gap-2 ${
                        isMine
                            ? "flex-row-reverse"
                            : "flex-row"
                    }`}
                >
                    <div
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
                            retryingTranslationKeys={
                                retryingTranslationKeys
                            }
                            retryTranslationErrorKeys={
                                retryTranslationErrorKeys
                            }
                            onRetryTranslation={
                                onRetryTranslation
                            }
                            onRefreshMessages={
                                onRefreshMessages
                            }
                        />
                    </div>

                    {messageTime && (
                        <time
                            dateTime={message.createdAt}
                            className="mb-1 shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                        >
                            {messageTime}
                        </time>
                    )}
                </div>
            </div>
        </div>
    );
}
