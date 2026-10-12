"use client";

import { useTranslations } from "next-intl";

import { SupportRecipientPicker } from "@/components/support/SupportRecipientPicker";
import { supportInput, supportLabel, supportPrimaryButton, supportSecondaryButton } from "@/components/support/supportStyles";
import { SUPPORT_CATEGORIES } from "@/features/support/supportModel";
import type { SupportComposerController } from "@/hooks/support/useSupportComposer";
import type { SupportController } from "@/hooks/support/useSupportController";
import type { SupportCategory } from "@/types/support";

export function SupportComposerView({ controller, composer }: { controller: SupportController; composer: SupportComposerController }) {
    const t = useTranslations("Support");
    const { tab, isBusy, isEditing, relatedMessage } = controller;
    const { draft, updateDraft } = composer;
    const canSubmit = Boolean(
        draft.title.trim() && draft.content.trim() && (tab !== "messages" || draft.recipient),
    );

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();

                // 필수 내용과 수신자 선택을 확인한 뒤 한 번만 등록한다.
                if (canSubmit && !isBusy) {
                    void controller.submitDraft(draft);
                }
            }}
            className="space-y-6"
        >
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t(isEditing ? "notices.editTitle" : `${tab}.composeTitle`)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`${tab}.composeDescription`)}</p>
            </div>

            {relatedMessage && (
                <div className="rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200">
                    {t("inquiries.relatedTo", { title: relatedMessage.title })}
                </div>
            )}
            {tab === "messages" && <SupportRecipientPicker composer={composer} disabled={isBusy} />}

            {tab === "inquiries" && (
                <label className={supportLabel}>
                    {t("form.category")}
                    <select
                        value={draft.category}
                        onChange={(event) => updateDraft("category", event.target.value as SupportCategory)}
                        disabled={isBusy}
                        className={supportInput}
                    >
                        {SUPPORT_CATEGORIES.map((category) => (
                            <option key={category} value={category}>{t(`category.${category}`)}</option>
                        ))}
                    </select>
                </label>
            )}

            <label className={supportLabel}>
                {t("form.title")}
                <input
                    value={draft.title}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    required
                    maxLength={200}
                    disabled={isBusy}
                    className={supportInput}
                    placeholder={t("form.titlePlaceholder")}
                />
            </label>

            <label className={supportLabel}>
                {t("form.content")}
                <textarea
                    value={draft.content}
                    onChange={(event) => updateDraft("content", event.target.value)}
                    required
                    maxLength={10000}
                    rows={10}
                    disabled={isBusy}
                    className={`${supportInput} resize-y leading-7`}
                    placeholder={t("form.contentPlaceholder")}
                />
            </label>

            {tab === "notices" && (
                <fieldset disabled={isBusy} className="space-y-3">
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("notices.typeLabel")}
                    </legend>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {(["NORMAL", "URGENT"] as const).map((noticeType) => (
                            <label
                                key={noticeType}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${draft.noticeType === noticeType
                                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-200"
                                    : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"}`}
                            >
                                <input
                                    type="radio"
                                    name="noticeType"
                                    value={noticeType}
                                    checked={draft.noticeType === noticeType}
                                    onChange={() => updateDraft("noticeType", noticeType)}
                                    aria-describedby="support-notice-type-guide"
                                    className="h-4 w-4 accent-violet-600"
                                />
                                {t(`notices.type.${noticeType}`)}
                            </label>
                        ))}
                    </div>

                    <p id="support-notice-type-guide" className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t(`notices.typeGuide.${draft.noticeType}`)}
                    </p>
                </fieldset>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
                <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => controller.navigate(tab, isEditing ? { id: controller.id! } : {})}
                    className={supportSecondaryButton}
                >
                    {t("cancel")}
                </button>
                <button type="submit" disabled={isBusy || !canSubmit} className={supportPrimaryButton}>
                    {t(isBusy ? "processing" : isEditing ? "save" : `${tab}.submit`)}
                </button>
            </div>
        </form>
    );
}
