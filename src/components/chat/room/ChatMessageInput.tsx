"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ChatMessageInputProps {
    onSend: (content: string) => boolean | Promise<boolean>;
    /**
     * 메시지 전송 처리 중 여부.
     * ChatRoomPage.tsx에서 isSending={isMessageSending}로 전달한다.
     */
    isSending?: boolean;
    /**
     * 채팅방 로딩/권한 없음 등 전송 자체를 막아야 하는 경우 사용한다.
     */
    disabled?: boolean;
    sendErrorMessage?: string | null;
}

export function ChatMessageInput({
    onSend,
    isSending = false,
    disabled = false,
    sendErrorMessage = null,
}: ChatMessageInputProps) {
    const t = useTranslations("ChatRoom");
    const [content, setContent] = useState("");

    const isDisabled = disabled || isSending;

    const submit = async () => {
        const trimmedContent = content.trim();

        if (!trimmedContent || isDisabled) {
            return;
        }

        const success = await onSend(trimmedContent);

        if (success) {
            setContent("");
        }
    };

    return (
        <footer className="shrink-0 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <div className="mx-auto max-w-4xl">
                {sendErrorMessage && (
                    <p className="mb-2 px-1 text-xs text-red-500 dark:text-red-400">
                        {sendErrorMessage}
                    </p>
                )}

                <form
                    className="flex items-end gap-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <textarea
                        value={content}
                        disabled={isDisabled}
                        onChange={(event) => setContent(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void submit();
                            }
                        }}
                        rows={1}
                        placeholder={t("input.placeholder")}
                        className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 caret-blue-500 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-900"
                    />

                    <button
                        type="submit"
                        disabled={!content.trim() || isDisabled}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                        aria-label={t("input.send")}
                    >
                        {isSending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <SendHorizontal className="h-5 w-5" />
                        )}
                    </button>
                </form>
            </div>
        </footer>
    );
}
