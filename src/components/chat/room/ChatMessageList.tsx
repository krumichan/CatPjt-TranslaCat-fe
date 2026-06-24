"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { ChatMessageItem } from "@/components/chat/room/ChatMessageItem";
import type { ChatMessage } from "@/types/chat";
import {
    isElementNearBottom,
    scrollElementToBottom,
} from "@/utils/scroll";

interface ChatMessageListProps {
    messages: ChatMessage[];
    currentUserEmail: string | null;
}

export function ChatMessageList({
    messages,
    currentUserEmail,
}: ChatMessageListProps) {
    const t = useTranslations("ChatRoom");
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const shouldStickToBottomRef = useRef(true);

    useEffect(() => {
        if (shouldStickToBottomRef.current) {
            scrollElementToBottom(scrollContainerRef.current, "smooth");
        }
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center px-4 py-6">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <MessageCircle className="h-7 w-7" />
                    </div>

                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {t("empty.title")}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("empty.description")}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main
            ref={scrollContainerRef}
            onScroll={() => {
                shouldStickToBottomRef.current = isElementNearBottom(
                    scrollContainerRef.current,
                );
            }}
            className="custom-scrollbar mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6"
        >
            <div className="mx-auto rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {t("date.today")}
            </div>

            {messages.map((message) => (
                <ChatMessageItem
                    key={message.id}
                    message={message}
                    isMine={
                        currentUserEmail != null && message.senderEmail === currentUserEmail
                    }
                />
            ))}
        </main>
    );
}