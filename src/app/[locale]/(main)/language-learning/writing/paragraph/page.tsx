import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { ParagraphWritingSmartPage } from "@/components/language-learning/writing/paragraph/ParagraphWritingSmartPage";
import ko from "../../../../../../../messages/ko/writingParagraph.json";
import ja from "../../../../../../../messages/ja/writingParagraph.json";
import learning from "../../../../../../../messages/learning/writingParagraph.json";

export const dynamic = "force-dynamic";

export default async function ParagraphWritingRoutePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    // 명시적으로 켠 로컬 QA 경로에서만 노출한다. 기존 Writing 진입점은 바꾸지 않는다.
    const host = (await headers()).get("host") ?? "";
    const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
    if (process.env.WRITING_PARAGRAPH_QA !== "true" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
        notFound();
    }

    const { locale } = await params;
    const messages = await getMessages();
    const paragraphMessages = locale === "ja" ? ja : locale === "learning" ? learning : ko;
    return (
        <NextIntlClientProvider messages={{ ...messages, ...paragraphMessages }}>
            <ParagraphWritingSmartPage />
        </NextIntlClientProvider>
    );
}
