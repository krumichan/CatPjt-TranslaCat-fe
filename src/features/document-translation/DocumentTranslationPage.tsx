"use client";

import { FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";

import { isTerminalAuthError } from "@/lib/authError";
import { Link } from "@/navigation";

import { DocumentJobPanel } from "./DocumentJobPanel";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { getDocumentTranslationCopy } from "./messages";
import { DOCUMENT_PANEL, DOCUMENT_PRIMARY_BUTTON } from "./styles";
import { DOCUMENT_TRANSLATION_PATH, documentJobPath } from "./model";

/** 인증된 로그인 세션 안에서만 제출 화면과 작업 상세를 표시한다. */
export function DocumentTranslationPage({ jobId }: { jobId?: string }) {
    const { data: session, status } = useSession();
    const locale = useLocale();
    const copy = getDocumentTranslationCopy(locale);
    const loginSessionId = status === "authenticated" && !isTerminalAuthError(session?.error)
        ? session?.loginSessionId : undefined;
    const returnPath = "/" + locale + (jobId ? documentJobPath(jobId) : DOCUMENT_TRANSLATION_PATH);

    // 소유 세션이 바뀌면 하위 화면의 파일, 요청 및 작업 상태도 초기화한다.
    return (
        <section className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 pb-14 pt-24 sm:px-8">
            <header className="flex flex-col gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    <FileText className="size-6" aria-hidden="true" />
                </span>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
                    {copy.title}
                </h1>
                {!jobId && <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.description}</p>}
            </header>

            {status === "loading" ? (
                <p role="status" className={DOCUMENT_PANEL}>{copy.signingIn}</p>
            ) : !loginSessionId ? (
                <div className={DOCUMENT_PANEL}>
                    <p className="font-semibold">{copy.loginRequired}</p>
                    {!jobId && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.reselect}</p>}
                    <Link
                        href={{ pathname: "/login", query: { callbackUrl: returnPath } }}
                        className={DOCUMENT_PRIMARY_BUTTON + " mt-4"}
                    >
                        {copy.login}
                    </Link>
                </div>
            ) : jobId ? (
                <DocumentJobPanel key={loginSessionId + ":" + jobId} jobId={jobId} loginSessionId={loginSessionId} copy={copy} locale={locale} />
            ) : (
                <DocumentUploadForm key={loginSessionId} loginSessionId={loginSessionId} copy={copy} />
            )}
        </section>
    );
}
