import type {RecentView} from "@/services/recentViewService";
import {ROUTES, to} from "@/constants/routes";
import {novelTargetLanguage, withNovelTarget} from "@/features/novel/translationLanguage";
import {catalogWorkPath} from "@/features/novel/catalog";

export const getRecentViewLink = (item: RecentView): string => {
    const { platformCode, novelId, episodeId, type } = item;
    const target = novelTargetLanguage(item.targetLanguage);

    switch (type) {
        case 'SHORT':
            // 과거 카쿠요무 단편 기록도 실제 회차 ID를 얻을 수 있는 작품 목차로 복원한다.
            return withNovelTarget(catalogWorkPath(platformCode, novelId, true), target);

        case 'NOVEL':
            return withNovelTarget(to(ROUTES.NOVEL_DETAIL, platformCode, novelId), target);

        case 'EPISODE':
            return withNovelTarget(to(ROUTES.EPISODE_VIEWER, platformCode, novelId, String(episodeId)), target);

        default:
            return ROUTES.HOME;
    }
}
