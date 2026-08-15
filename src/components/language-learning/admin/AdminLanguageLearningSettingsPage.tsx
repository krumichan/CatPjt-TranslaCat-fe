"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { AdminLanguageLearningSettingsSmartForm } from "@/components/language-learning/admin/AdminLanguageLearningSettingsSmartForm";

export function AdminLanguageLearningSettingsPage() {
    const t = useTranslations("LanguageLearning.admin");
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-24 text-sm text-slate-500 sm:px-6 lg:px-8">{t("loading")}</div>;
    }

    if (session?.user?.role !== "ADMIN") {
        return <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-24 text-sm font-bold text-rose-600 sm:px-6 lg:px-8">{t("forbidden")}</div>;
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <SettingsSubPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <AdminLanguageLearningSettingsSmartForm />
        </div>
    );
}
