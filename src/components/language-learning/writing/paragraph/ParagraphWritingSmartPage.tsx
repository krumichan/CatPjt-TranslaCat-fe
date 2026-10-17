"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { ParagraphWritingWorkspace } from "./ParagraphWritingWorkspace";

export function ParagraphWritingSmartPage() {
    const t = useTranslations("ParagraphWriting");
    const { data: session, status } = useSession();
    const owner = session?.user?.publicId;
    const loginSessionId = session?.loginSessionId;

    return (
        <LanguageLearningPageLayout guideTopic="language-learning/writing" title={t("title")} description={t("description")}>
            {status === "loading" ? <p role="status">{t("loading")}</p> : owner && loginSessionId ? (
                <ParagraphWritingWorkspace key={`${owner}:${loginSessionId}`} owner={owner} loginSessionId={loginSessionId} />
            ) : <p role="alert">{t("signedOut")}</p>}
        </LanguageLearningPageLayout>
    );
}
