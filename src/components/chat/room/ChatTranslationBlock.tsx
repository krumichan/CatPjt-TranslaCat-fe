import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { getChatTranslationKey } from "@/hooks/chat/useChatRoom";
import type {
    ChatLanguageSettings,
    ChatMessageTranslation,
} from "@/types/chat";
import { getVisibleTranslations } from "@/utils/chat/chatTranslations";

interface ChatTranslationBlockProps {
    messageId: number;
    translations: ChatMessageTranslation[];
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

export function ChatTranslationBlock({
    messageId,
    translations,
    isMine,
    languageSettings,
    retryingTranslationKeys,
    retryTranslationErrorKeys,
    onRetryTranslation,
    onRefreshMessages,
}: ChatTranslationBlockProps) {
    const t = useTranslations("ChatRoom");
    const visibleTranslations = getVisibleTranslations(
        translations,
        languageSettings,
    );

    if (visibleTranslations.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 space-y-2 border-t border-white/20 pt-3 dark:border-white/10">
            {visibleTranslations.map((translation) => {
                const translatedContent =
                    translation.translatedContent?.trim() ?? "";
                const translationKey = getChatTranslationKey(
                    messageId,
                    translation.languageCode,
                );
                const isRetrying =
                    translation.status === "PENDING" ||
                    retryingTranslationKeys.includes(translationKey);
                const hasRetryError =
                    retryTranslationErrorKeys.includes(translationKey);

                return (
                    <div
                        key={translation.languageCode}
                        className={`rounded-2xl px-3 py-2 text-xs ${
                            isMine
                                ? "bg-white/10 text-blue-50"
                                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        }`}
                    >
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] ${
                                    isMine
                                        ? "bg-white/15 text-blue-50"
                                        : "bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-white/10"
                                }`}
                            >
                                {translation.languageCode}
                            </span>

                            {translation.status === "FAILED" && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void onRetryTranslation(
                                            messageId,
                                            translation.languageCode,
                                        )
                                    }
                                    disabled={isRetrying}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                        isMine
                                            ? "bg-white/15 text-white hover:bg-white/25"
                                            : "bg-white text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50 dark:bg-slate-950 dark:text-rose-200 dark:ring-rose-400/30 dark:hover:bg-rose-500/10"
                                    }`}
                                >
                                    {isRetrying ? (
                                        <Loader2
                                            className="h-3 w-3 animate-spin"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <RefreshCcw
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {isRetrying
                                        ? t("translation.retrying")
                                        : t("translation.retry")}
                                </button>
                            )}
                        </div>

                        {translation.status === "COMPLETED" &&
                            translatedContent && (
                                <p className="whitespace-pre-wrap break-words leading-5">
                                    {translatedContent}
                                </p>
                            )}

                        {translation.status === "PENDING" && (
                            <p className="inline-flex items-center gap-1.5 font-semibold opacity-80">
                                <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                />
                                {t("translation.pending")}
                            </p>
                        )}

                        {translation.status === "FAILED" && (
                            <div className="space-y-1">
                                <p className="inline-flex items-center gap-1.5 font-semibold text-rose-100 dark:text-rose-200">
                                    <AlertTriangle
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                    {t("translation.failed")}
                                </p>

                                {hasRetryError && (
                                    <p className="text-[11px] font-semibold text-rose-100 dark:text-rose-200">
                                        {t("translation.retryFailed")}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={() => void onRefreshMessages()}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black transition ${
                                        isMine
                                            ? "bg-white/10 text-blue-50 hover:bg-white/20"
                                            : "bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10"
                                    }`}
                                >
                                    <RefreshCcw
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                    />
                                    {t("translation.refreshShort")}
                                </button>
                            </div>
                        )}

                        {translation.status === "COMPLETED" &&
                            !translatedContent && (
                                <p className="inline-flex items-center gap-1.5 font-semibold opacity-80">
                                    <Loader2
                                        className="h-3.5 w-3.5 animate-spin"
                                        aria-hidden="true"
                                    />
                                    {t("translation.pending")}
                                </p>
                            )}
                    </div>
                );
            })}
        </div>
    );
}
