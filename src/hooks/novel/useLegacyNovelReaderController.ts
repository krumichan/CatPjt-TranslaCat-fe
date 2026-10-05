"use client";

import { useEffect } from "react";
import { useLocalizedName } from "@/hooks/useLocalizedName";
import { useQuery } from "@/hooks/useQuery";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useMenuControl } from "@/hooks/useMenuControl";
import { useAppRouter } from "@/hooks/useAppRouter";
import { episodeService } from "@/services/episodeService";
import { useReaderFontSize } from "@/hooks/novel/useReaderFontSize";
import { ROUTES, to } from "@/constants/routes";
import { scrollToTop } from "@/utils/scroll";

export function useLegacyNovelReaderController(platform: string, novel: string, episode: string) {
    const router = useAppRouter();
    const ln = useLocalizedName();
    const menu = useMenuControl({ hasBottomBar: true });
    const query = useQuery({ keys: [platform, novel, episode] as const, fetcher: episodeService.getEpisodeDetail });
    const { fontSize, changeFont } = useReaderFontSize();
    useScrollLock(query.isLoading);

    useEffect(() => { scrollToTop("instant"); }, [platform, novel, episode]);
    const navigate = (target?: string | null) => {
        if (target) router.push(to(ROUTES.EPISODE_VIEWER, platform, query.data?.pagerInfo?.listIdentifier ?? novel, target));
    };

    return {
        ...query, ln, menu, fontSize, changeFont,
        onPrev: () => navigate(query.data?.pagerInfo?.prevIdentifier),
        onNext: () => navigate(query.data?.pagerInfo?.nextIdentifier),
        onList: () => router.push(to(ROUTES.NOVEL_DETAIL, platform, query.data?.pagerInfo?.listIdentifier ?? novel)),
        // 기존 BE 조회가 최근 활동 기록을 소유한다. FE 재검증마다 중복 저장하지 않는다.
        // 사전 등록 후에는 HTML 정규식 치환 대신 기존 조회 계약으로 새 루비를 받는다.
        onRegisterSuccess: () => { void query.mutate(); },
    };
}
