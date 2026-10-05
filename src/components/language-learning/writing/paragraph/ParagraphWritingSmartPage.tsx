"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { ParagraphWritingWorkspace } from "./ParagraphWritingWorkspace";

export function ParagraphWritingSmartPage() {
    const t = useTranslations("ParagraphWriting");
    const { data: session, status } = useSession();
    const owner = session?.user?.publicId;

    return (
        <LanguageLearningPageLayout title={t("title")} description={t("description")}>
            {status === "loading" ? <p role="status">{t("loading")}</p> : owner ? (
                <ParagraphWritingWorkspace key={owner} owner={owner} />
            ) : <p role="alert">{t("signedOut")}</p>}
        </LanguageLearningPageLayout>
    );
}
