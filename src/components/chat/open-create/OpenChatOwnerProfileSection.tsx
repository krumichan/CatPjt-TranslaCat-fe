"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { OpenChatProfileForm } from "@/components/chat/open-profile/OpenChatProfileForm";
import type { OpenChatCreateSubmissionController } from "@/hooks/chat/openChatCreateTypes";

interface OpenChatOwnerProfileSectionProps {
    controller: OpenChatCreateSubmissionController;
}

export function OpenChatOwnerProfileSection({
    controller,
}: OpenChatOwnerProfileSectionProps) {
    const t = useTranslations("OpenChatCreate");
    const {
        createdRoomId,
        isSubmitting,
        processStage,
        profileErrorCode,
        submitErrorCode,
        validateRoomFields,
        submit,
        cancel,
    } = controller;

    return (
        <section
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
            data-testid="open-chat-owner-profile-section"
        >
            <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                        {t("owner.eyebrow")}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                        {t("owner.title")}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
                        {t("owner.description")}
                    </p>
                </div>
            </div>

            {submitErrorCode && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    data-testid="open-chat-create-submit-error"
                >
                    {t(`errors.${submitErrorCode}`)}
                </div>
            )}

            <OpenChatProfileForm
                mode="create-owner"
                initialNickname=""
                isSubmitting={isSubmitting}
                processStage={processStage}
                errorCode={profileErrorCode}
                submitLabel={
                    createdRoomId === null
                        ? undefined
                        : t("actions.retryProfile")
                }
                beforeSubmit={validateRoomFields}
                onSubmit={submit}
                onCancel={cancel}
            />
        </section>
    );
}
