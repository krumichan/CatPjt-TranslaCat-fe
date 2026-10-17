"use client";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { GuideHelpLink } from "@/components/common/GuideHelpLink";
import { SupportListRow } from "@/components/support/SupportListRow";
import { supportInput, supportPrimaryButton, supportSecondaryButton } from "@/components/support/supportStyles";
import type { SupportController } from "@/hooks/support/useSupportController";

export function SupportList({ controller }: { controller: SupportController }) {
    const t = useTranslations("Support");
    const { tab, isAdmin, items, navigate, page, totalPages, status, search } = controller;
    const titleKey = isAdmin && tab !== "notices" ? `${tab}.adminTitle` : `${tab}.title`;

    return (
        <div>
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t(titleKey)}</h2>
                        <GuideHelpLink topic={`support/${tab}`} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`${tab}.${isAdmin ? "adminDescription" : "description"}`)}</p>
                </div>

                {controller.canCreate && (
                    <button
                        type="button"
                        onClick={() => navigate(tab, { view: "new" })}
                        className={supportPrimaryButton}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t(`${tab}.create`)}
                    </button>
                )}
            </div>

            {tab === "inquiries" && (
                <form
                    key={`${status ?? ""}:${search}`}
                    className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                    onSubmit={(event) => {
                        event.preventDefault();

                        // 검색 조건을 URL에 보존해 뒤로 가기로 같은 목록을 다시 연다.
                        const values = new FormData(event.currentTarget);

                        navigate(tab, { status, search: String(values.get("search") ?? "").trim() });
                    }}
                >
                    <select
                        value={status ?? ""}
                        aria-label={t("inquiries.statusFilter")}
                        onChange={(event) => navigate(tab, { status: event.target.value, search })}
                        className={`${supportInput} col-span-2 sm:col-span-1 sm:w-auto!`}
                    >
                        <option value="">{t("status.ALL")}</option>
                        <option value="WAITING">{t("status.WAITING")}</option>
                        <option value="ANSWERED">{t("status.ANSWERED")}</option>
                        <option value="CLOSED">{t("status.CLOSED")}</option>
                    </select>

                    <input
                        name="search"
                        defaultValue={search}
                        maxLength={200}
                        aria-label={t("inquiries.search")}
                        placeholder={t("inquiries.search")}
                        className={supportInput}
                    />
                    <button type="submit" className={supportSecondaryButton} aria-label={t("search")}>
                        <Search className="h-4 w-4" aria-hidden="true" />
                    </button>
                </form>
            )}

            <div className="border-t border-slate-200 dark:border-white/10">
                {items.length === 0 ? (
                    <p className="py-20 text-center text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`${tab}.empty`)}</p>
                ) : items.map((item) => (
                    <SupportListRow
                        key={item.id}
                        item={item}
                        isAdmin={isAdmin}
                        onOpen={() => navigate(tab, { id: item.id })}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <nav aria-label={t("pagination")} className="mt-7 flex items-center justify-center gap-4">
                    <button
                        type="button"
                        disabled={page === 0}
                        aria-label={t("previousPage")}
                        onClick={() => navigate(tab, { page: page - 1, status, search })}
                        className={supportSecondaryButton}
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="text-sm text-slate-500">{t("pageCount", { current: page + 1, total: totalPages })}</span>
                    <button
                        type="button"
                        disabled={page + 1 >= totalPages}
                        aria-label={t("nextPage")}
                        onClick={() => navigate(tab, { page: page + 1, status, search })}
                        className={supportSecondaryButton}
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                </nav>
            )}
        </div>
    );
}
