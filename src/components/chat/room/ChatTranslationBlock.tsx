import { useTranslations } from "next-intl";

import type { ChatMessageTranslation } from "@/types/chat";

interface ChatTranslationBlockProps {
    translations: ChatMessageTranslation[];
    isMine: boolean;
}

export function ChatTranslationBlock({
    translations,
    isMine,
}: ChatTranslationBlockProps) {
    const t = useTranslations("ChatRoom");

    if (translations.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-1 ${isMine ? "text-right" : "text-left"}`}>
            {translations.map((translation) => (
                <div
                    key={translation.id}
                    className={`inline-block max-w-full rounded-xl border px-3 py-2 text-xs ${
                        isMine
                            ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
                            : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                >
                    <p className="mb-1 text-[10px] font-medium uppercase opacity-70">
                        {translation.languageCode}
                    </p>

                    {translation.status === "COMPLETED" && (
                        <p className="whitespace-pre-wrap break-words">
                            {translation.translatedContent}
                        </p>
                    )}

                    {translation.status === "PENDING" && (
                        <p className="animate-pulse">{t("translation.pending")}</p>
                    )}

                    {translation.status === "FAILED" && (
                        <p title={translation.failureReason ?? undefined}>
                            {t("translation.failed")}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}