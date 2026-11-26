import { notFound } from "next/navigation";

import { DocumentTranslationPage } from "@/features/document-translation/DocumentTranslationPage";
import { isDocumentJobId } from "@/features/document-translation/model";

/** 새로고침과 직접 링크에서 같은 작업을 열고 잘못된 식별자는 404로 처리한다. */
export default async function DocumentTranslationJobRoute({
    params,
}: {
    params: Promise<{ jobId: string }>;
}) {
    const { jobId } = await params;
    if (!isDocumentJobId(jobId)) {
        notFound();
    }

    return <DocumentTranslationPage jobId={jobId} />;
}
