"use client";

import { useParams } from "next/navigation";
import LegacyNovelRankingSmartPage from "@/components/novel/LegacyNovelRankingSmartPage";
import NovelCatalogSmartPage from "@/components/novel/NovelCatalogSmartPage";
import { supportsNovelTranslation } from "@/features/novel/translationLanguage";

export default function GenreRankingPage() {
    const params = useParams();
    // 지원 플랫폼은 내장 catalog를 사용하고 다른 플랫폼의 기존 조회 계약은 보존한다.
    return supportsNovelTranslation(String(params.platformCode))
        ? <NovelCatalogSmartPage kind="RANKING" /> : <LegacyNovelRankingSmartPage />;
}
