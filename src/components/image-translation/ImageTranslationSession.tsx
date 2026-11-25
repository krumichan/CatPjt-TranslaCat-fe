"use client";

import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";

import { getImageTranslationMessages } from "@/features/image-translation/messages";

import { ImageTranslationWorkspace } from "./ImageTranslationWorkspace";

/** 로그인 상태가 확인된 뒤에만 비공개 작업과 원본을 불러온다. */
export function ImageTranslationSession({ initialJobId }: { initialJobId?: string }) {
    const { data: session, status } = useSession();
    const locale = useLocale();
    if (status !== "authenticated" || !session?.loginSessionId) {
        return <main className="mx-auto max-w-4xl p-6 pt-24">{getImageTranslationMessages(locale).signingIn}</main>;
    }

    return <ImageTranslationWorkspace key={session.loginSessionId} initialJobId={initialJobId} sessionId={session.loginSessionId} />;
}
