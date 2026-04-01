export const ROUTES = {
    HOME: '/',

    NOVEL_SELECT: '/novel',
    NOVEL_DETAIL: '/novel/[platformCode]/novels/[identifier]',
    NOVEL_SEARCH: '/novel/[platformCode]/search/novels',
    NOVEL_GENRE: '/novel/[platformCode]/genres/[genreId]',
    EPISODE_VIEWER: '/novel/[platformCode]/novels/[identifier]/episode/[episodeId]',

    VOICE_SELECT: '/voice',

    CHAT_SELECT: '/chat',
    CHAT_ENTER_ROOM: '/chat/[roomId]',

} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const to = (path: string, ...params: string[]): any => {
    let result = path;

    const placeholders = result.match(/\[[^\]]+]/g);

    if (placeholders) {
        placeholders.forEach((placeholder, index) => {
            if (params[index]) {
                result = result.replace(placeholder, params[index].toLowerCase());
            }
        });
    }

    return result;
};
