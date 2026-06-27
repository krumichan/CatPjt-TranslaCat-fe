import { useTranslations } from "next-intl";

import type {ChatLanguageSettings, ChatMessageTranslation} from "@/types/chat";
import {getVisibleTranslations} from "@/utils/chat/chatTranslations";

interface ChatTranslationBlockProps {
    translations: ChatMessageTranslation[];
    isMine: boolean;
    languageSettings: ChatLanguageSettings | null;
}

export function ChatTranslationBlock({
    translations,
    isMine,
    languageSettings,
}: ChatTranslationBlockProps) {
    const t = useTranslations("ChatRoom");

    const visibleTranslations = getVisibleTranslations(
        translations,
        languageSettings,
        isMine,
    );

    if (visibleTranslations.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 space-y-1">
            {visibleTranslations.map((translation) => (
                <div
                    key={`${translation.languageCode}-${translation.id}`}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
                >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {translation.languageCode}
                    </div>

                    {translation.status === "COMPLETED" && (
                        <p className="whitespace-pre-wrap wrap-break-word">
                            {translation.translatedContent}
                        </p>
                    )}

                    {translation.status === "PENDING" && (
                        <p className="text-slate-400 dark:text-slate-500">
                            {t("translation.pending")}
                        </p>
                    )}

                    {translation.status === "FAILED" && (
                        <p className="text-red-500 dark:text-red-300">
                            {t("translation.failed")}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}