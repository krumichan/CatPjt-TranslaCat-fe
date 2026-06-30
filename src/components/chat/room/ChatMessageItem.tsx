import { useLocale } from "next-intl";

import { ChatTranslationBlock } from "@/components/chat/room/ChatTranslationBlock";
import type { ChatLanguageSettings, ChatMessage } from "@/types/chat";
import { shouldShowOriginalMessageContent } from "@/utils/chat/chatTranslations";

interface ChatMessageItemProps {
    message: ChatMessage;
    isMine: boolean;
    languageSettings: ChatLanguageSettings | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
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
    onRetryTranslation,
    onRefreshMessages,
}: ChatMessageItemProps) {
    const locale = useLocale();
    const showOriginalContent = shouldShowOriginalMessageContent(
        message.translations,
        languageSettings,
    );
    const messageTime = formatMessageTime(message.createdAt, locale);

    return (
        <div
            className={`flex w-full flex-col ${
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
                    isMine ? "flex-row-reverse" : "flex-row"
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
                        retryingTranslationKeys={retryingTranslationKeys}
                        retryTranslationErrorKeys={retryTranslationErrorKeys}
                        onRetryTranslation={onRetryTranslation}
                        onRefreshMessages={onRefreshMessages}
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
    );
}
