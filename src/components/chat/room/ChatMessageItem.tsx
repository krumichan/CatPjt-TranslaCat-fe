import { useLocale } from "next-intl";

import { ChatTranslationBlock } from "@/components/chat/room/ChatTranslationBlock";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageItemProps {
    message: ChatMessage;
    isMine: boolean;
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

export function ChatMessageItem({ message, isMine }: ChatMessageItemProps) {
    const locale = useLocale();

    return (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[82%] space-y-1 sm:max-w-[70%] ${
                    isMine ? "items-end" : "items-start"
                }`}
            >
                {!isMine && (
                    <p className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {message.senderName ?? "Unknown"}
                    </p>
                )}

                <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                        isMine
                            ? "rounded-br-sm bg-blue-600 text-white"
                            : "rounded-bl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.content}
                    </p>
                </div>

                <ChatTranslationBlock
                    translations={message.translations}
                    isMine={isMine}
                />

                <p
                    className={`px-1 text-[11px] text-slate-400 ${
                        isMine ? "text-right" : "text-left"
                    }`}
                >
                    {formatMessageTime(message.createdAt, locale)}
                </p>
            </div>
        </div>
    );
}