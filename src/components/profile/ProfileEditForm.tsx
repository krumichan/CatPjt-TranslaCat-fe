"use client";

import { RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SyntheticEvent } from "react";

import type { ProfileFormState } from "@/hooks/profile/useMyProfile";
import type { UserProfile } from "@/types/social";

interface ProfileEditFormProps {
    form: ProfileFormState;
    profile: UserProfile;
    isSaving: boolean;
    saveErrorCode: string | null;
    validationErrors: Partial<Record<keyof ProfileFormState, string>>;
    hasChanges: boolean;
    isSaved: boolean;
    onChange: <K extends keyof ProfileFormState>(
        key: K,
        value: ProfileFormState[K],
    ) => void;
    onReset: () => void;
    onSave: () => Promise<boolean>;
}

export default function ProfileEditForm({
    form,
    profile,
    isSaving,
    saveErrorCode,
    validationErrors,
    hasChanges,
    isSaved,
    onChange,
    onReset,
    onSave,
}: ProfileEditFormProps) {
    const t = useTranslations("Social.profilePage.form");
    const tMessage = useTranslations("Social.profilePage.messages");
    const tValidation = useTranslations(
        "Social.profilePage.validation",
    );

    const handleSubmit = async (
        event: SyntheticEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        await onSave();
    };

    const getValidationMessage = (key?: string) => {
        if (!key) {
            return null;
        }

        return tValidation(key);
    };

    return (
        <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                    {t("eyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {t("description")}
                </p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <div>
                    <label
                        htmlFor="publicId"
                        className="text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                        {t("fields.publicId")}
                    </label>
                    <input
                        id="publicId"
                        type="text"
                        value={profile.publicId}
                        disabled
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                        {t("hints.publicIdReadonly")}
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="nickname"
                        className="text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                        {t("fields.nickname")}
                    </label>
                    <input
                        id="nickname"
                        type="text"
                        value={form.nickname}
                        maxLength={30}
                        onChange={(event) =>
                            onChange("nickname", event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400/60 dark:focus:ring-orange-500/10"
                        placeholder={t("placeholders.nickname")}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-rose-500">
                            {getValidationMessage(
                                validationErrors.nickname,
                            )}
                        </p>
                        <p className="text-xs text-slate-400">
                            {form.nickname.trim().length}/30
                        </p>
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="bio"
                        className="text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                        {t("fields.bio")}
                    </label>
                    <textarea
                        id="bio"
                        value={form.bio}
                        maxLength={200}
                        rows={5}
                        onChange={(event) =>
                            onChange("bio", event.target.value)
                        }
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400/60 dark:focus:ring-orange-500/10"
                        placeholder={t("placeholders.bio")}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-rose-500">
                            {getValidationMessage(validationErrors.bio)}
                        </p>
                        <p className="text-xs text-slate-400">
                            {form.bio.length}/200
                        </p>
                    </div>
                </div>

                {saveErrorCode === "SAVE_FAILED" && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                        {tMessage("saveFailed")}
                    </div>
                )}

                {isSaved && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {tMessage("saved")}
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={isSaving || !hasChanges}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-orange-400/60 dark:hover:text-orange-200"
                    >
                        <RotateCcw
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                        {t("actions.cancel")}
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving || !hasChanges}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                    >
                        <Save
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                        {isSaving
                            ? t("actions.saving")
                            : t("actions.save")}
                    </button>
                </div>
            </form>
        </section>
    );
}
