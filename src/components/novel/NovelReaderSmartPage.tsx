"use client";

import NovelReaderView from "@/components/novel/NovelReaderView";
import { useNovelReaderController } from "@/hooks/novel/useNovelReaderController";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { novelTargetLanguage, supportsNovelTranslation, type NovelTargetLanguage } from "@/features/novel/translationLanguage";

export default function NovelReaderSmartPage({ platformCode, novelIdentifier, episodeIdentifier }: { platformCode: string; novelIdentifier: string; episodeIdentifier: string }) {
    const query = useSearchParams();
    const { data: session } = useSession();
    const targetLanguage = supportsNovelTranslation(platformCode) ? novelTargetLanguage(query.get("novelTarget")) : "ko";
    // 언어·계정 변경 시 이전 본문과 음성 캐시를 새 화면이 한 프레임도 이어받지 않는다.
    const scope = `${platformCode}:${novelIdentifier}:${episodeIdentifier}:${targetLanguage}:${session?.user.publicId ?? session?.user.email ?? ""}`;
    return <ScopedReader key={scope} platformCode={platformCode} novelIdentifier={novelIdentifier} episodeIdentifier={episodeIdentifier} targetLanguage={targetLanguage} />;
}

function ScopedReader({ platformCode, novelIdentifier, episodeIdentifier, targetLanguage }: { platformCode: string; novelIdentifier: string; episodeIdentifier: string; targetLanguage: NovelTargetLanguage }) {
    const controller = useNovelReaderController(platformCode, novelIdentifier, episodeIdentifier, targetLanguage);
    return <NovelReaderView controller={controller} />;
}
