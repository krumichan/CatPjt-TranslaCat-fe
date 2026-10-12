"use client";

import { Check, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { supportInput, supportLabel, supportSecondaryButton } from "@/components/support/supportStyles";
import type { SupportComposerController } from "@/hooks/support/useSupportComposer";

export function SupportRecipientPicker({ composer, disabled }: { composer: SupportComposerController; disabled: boolean }) {
    const t = useTranslations("Support");
    const noResults = composer.hasSearched && !composer.isSearching && composer.recipients.length === 0;

    return (
        <fieldset disabled={disabled} className="space-y-3">
            <div className="flex items-end gap-2">
                <label className={`${supportLabel} min-w-0 flex-1`}>
                    {t("messages.searchRecipient")}
                    <input
                        value={composer.recipientQuery}
                        onChange={(event) => composer.updateRecipientQuery(event.target.value)}
                        maxLength={100}
                        className={supportInput}
                        placeholder={t("messages.recipientPlaceholder")}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                void composer.searchRecipients();
                            }
                        }}
                    />
                </label>
                <button
                    type="button"
                    disabled={composer.isSearching || composer.recipientQuery.trim().length < 2}
                    onClick={() => void composer.searchRecipients()}
                    className={supportSecondaryButton}
                >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    {t(composer.isSearching ? "searching" : "search")}
                </button>
            </div>

            <div aria-live="polite">
                {composer.searchError ? (
                    <p className="text-sm text-red-600 dark:text-red-300">{t(`error.${composer.searchError}`)}</p>
                ) : noResults ? (
                    <p className="text-sm text-slate-500">{t("messages.noRecipients")}</p>
                ) : null}
            </div>

            {composer.recipients.length > 0 && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-white/10">
                    {composer.recipients.map((recipient) => (
                        <button
                            key={recipient.id}
                            type="button"
                            aria-pressed={composer.draft.recipient?.id === recipient.id}
                            onClick={() => composer.updateDraft("recipient", recipient)}
                            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm ${composer.draft.recipient?.id === recipient.id
                                ? "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200"
                                : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"}`}
                        >
                            <span className="min-w-0 flex-1 break-words">
                                {recipient.name}
                                <span className="ml-2 text-xs text-slate-500">{recipient.publicId}</span>
                            </span>
                            {composer.draft.recipient?.id === recipient.id && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}

            {composer.draft.recipient && (
                <p className="text-xs text-violet-600 dark:text-violet-300">
                    {t("messages.selectedRecipient", {
                        name: composer.draft.recipient.name,
                        publicId: composer.draft.recipient.publicId,
                    })}
                </p>
            )}
        </fieldset>
    );
}
