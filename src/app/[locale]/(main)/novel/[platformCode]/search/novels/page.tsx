"use client";

import { useParams } from "next/navigation";
import LegacyNovelSearchSmartPage from "@/components/novel/LegacyNovelSearchSmartPage";
import NovelCatalogSmartPage from "@/components/novel/NovelCatalogSmartPage";

export default function SearchNovelPage() {
    const params = useParams();
    // 지원 플랫폼은 내장 catalog를 사용하고 다른 플랫폼의 기존 조회 계약은 보존한다.
    return ["syosetu", "syosyetu"].includes(String(params.platformCode))
        ? <NovelCatalogSmartPage kind="SEARCH" /> : <LegacyNovelSearchSmartPage />;
}
