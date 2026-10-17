import type {RecentView} from "@/services/recentViewService";
import {ROUTES, to} from "@/constants/routes";
import {novelTargetLanguage, withNovelTarget} from "@/features/novel/translationLanguage";

export const getRecentViewLink = (item: RecentView): string => {
    const { platformCode, novelId, episodeId, type } = item;
    const target = novelTargetLanguage(item.targetLanguage);

    switch (type) {
        case 'SHORT':
            return withNovelTarget(to(ROUTES.EPISODE_VIEWER, platformCode, novelId, "0"), target);

        case 'NOVEL':
            return withNovelTarget(to(ROUTES.NOVEL_DETAIL, platformCode, novelId), target);

        case 'EPISODE':
            return withNovelTarget(to(ROUTES.EPISODE_VIEWER, platformCode, novelId, String(episodeId)), target);

        default:
            return ROUTES.HOME;
    }
}
