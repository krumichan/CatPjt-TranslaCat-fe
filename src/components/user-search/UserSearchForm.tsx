"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SyntheticEvent } from "react";

import type { UserSearchErrorCode } from "@/hooks/user-search/usePublicIdUserSearch";

interface UserSearchFormProps {
    publicId: string;
    isSearching: boolean;
    searchErrorCode: UserSearchErrorCode | null;
    onChange: (value: string) => void;
    onSubmit: () => Promise<boolean>;
    onClear: () => void;
}

export default function UserSearchForm({
    publicId,
    isSearching,
    searchErrorCode,
    onChange,
    onSubmit,
    onClear,
}: UserSearchFormProps) {
    const t = useTranslations("Social.userSearchPage.form");
    const tMessages = useTranslations("Social.userSearchPage.messages");

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        await onSubmit();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                    {t("eyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {t("description")}
                </p>
            </div>

            <div className="mt-6">
                <label
                    htmlFor="publicId"
                    className="text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                    {t("fields.publicId")}
                </label>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                        <input
                            id="publicId"
                            type="text"
                            value={publicId}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder={t("placeholders.publicId")}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-400/60 dark:focus:ring-orange-500/10"
                        />

                        {publicId && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    onClear();
                                }}
                                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-100"
                                aria-label={t("actions.clear")}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSearching}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                        {isSearching
                            ? t("actions.searching")
                            : t("actions.search")}
                    </button>
                </div>

                {searchErrorCode === "PUBLIC_ID_REQUIRED" && (
                    <p className="mt-2 text-xs font-bold text-rose-500">
                        {tMessages("publicIdRequired")}
                    </p>
                )}
            </div>
        </form>
    );
}
