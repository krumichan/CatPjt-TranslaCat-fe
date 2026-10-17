"use client";

import { ArrowLeft, Headphones, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import { GuideHelpLink } from "@/components/common/GuideHelpLink";
import SectionHeader from "@/components/common/SectionHeader";
import { SupportComposerSmart } from "@/components/support/SupportComposerSmart";
import { SupportContentDetail } from "@/components/support/SupportContentDetail";
import { SupportInquiryDetail } from "@/components/support/SupportInquiryDetail";
import { SupportList } from "@/components/support/SupportList";
import { SupportNavigation } from "@/components/support/SupportNavigation";
import { supportSecondaryButton } from "@/components/support/supportStyles";
import type { SupportController } from "@/hooks/support/useSupportController";

export function SupportView({ controller }: { controller: SupportController }) {
    const t = useTranslations("Support");
    const { detail, isComposing, isLoading, error, actionError, tab, id } = controller;

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-28">
            <SectionHeader
                title={t(controller.isAdmin ? "adminTitle" : "title")}
                icon={<Headphones className="h-6 w-6 text-violet-500" aria-hidden="true" />}
            >
                <GuideHelpLink topic="support" variant="text" />
            </SectionHeader>

            <div className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:flex-row dark:border-white/10 dark:bg-slate-900">
                <SupportNavigation controller={controller} />

                <section
                    aria-label={t("contentRegion")}
                    aria-busy={isLoading || controller.isBusy}
                    className="min-w-0 flex-1 p-5 sm:p-8"
                >
                    {!isComposing && controller.authStatus === "authenticated" && (
                        <button
                            type="button"
                            disabled={isLoading || controller.isBusy}
                            onClick={controller.reload}
                            aria-label={t("refresh")}
                            className="float-right ml-3 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-violet-600 disabled:opacity-50 dark:hover:bg-white/5"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                    {(id || isComposing) && (
                        <button
                            type="button"
                            disabled={controller.isBusy}
                            onClick={() => controller.navigate(tab)}
                            className="mb-7 inline-flex min-h-9 items-center gap-2 text-sm text-slate-500 hover:text-violet-600 disabled:opacity-50 dark:text-slate-400"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            {t("backToList")}
                        </button>
                    )}

                    {actionError && (
                        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            {t(`error.${actionError}`)}
                        </p>
                    )}

                    {controller.authStatus === "unauthenticated" ? (
                        <p className="py-16 text-center text-sm text-slate-500">{t("loginRequired")}</p>
                    ) : isLoading ? (
                        <div role="status" className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500">
                            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                            {t("loading")}
                        </div>
                    ) : error ? (
                        <div className="space-y-4 py-16 text-center">
                            <p role="alert" className="text-sm text-slate-500">{t(`error.${error}`)}</p>
                            <button type="button" onClick={controller.reload} className={supportSecondaryButton}>
                                {t("retry")}
                            </button>
                        </div>
                    ) : isComposing ? (
                        <SupportComposerSmart key={controller.scope} controller={controller} />
                    ) : detail && id ? (
                        "status" in detail ? (
                            <SupportInquiryDetail key={detail.id} inquiry={detail} controller={controller} />
                        ) : (
                            <SupportContentDetail item={detail} controller={controller} />
                        )
                    ) : (
                        <SupportList controller={controller} />
                    )}
                </section>
            </div>

            <ConfirmModal
                isOpen={controller.deleteOpen}
                title={t("notices.deleteTitle")}
                description={t("notices.deleteDescription")}
                confirmLabel={t("delete")}
                variant="danger"
                isLoading={controller.isBusy}
                onClose={() => controller.setDeleteOpen(false)}
                onConfirm={async () => {
                    await controller.deleteNotice();
                }}
            />
        </div>
    );
}
