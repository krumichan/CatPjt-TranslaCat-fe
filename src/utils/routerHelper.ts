import {RecentView} from "@/services/recentViewService";
import {ROUTES, to} from "@/constants/routes";

export const getRecentViewLink = (item: RecentView): string => {
    const { platformCode, novelId, episodeId, type } = item;

    switch (type) {
        case 'SHORT':
            return to(ROUTES.EPISODE_VIEWER, platformCode, novelId, "0");

        case 'NOVEL':
            return to(ROUTES.NOVEL_DETAIL, platformCode, novelId);

        case 'EPISODE':
            return to(ROUTES.EPISODE_VIEWER, platformCode, novelId, String(episodeId));

        default:
            return ROUTES.HOME;
    }
}