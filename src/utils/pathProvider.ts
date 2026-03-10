export const paths = {
    // 소설 상세 페이지
    novelDetail: (platformCode: string, identifier: string) =>
        `/${platformCode}/novels/${identifier}`,

    // 특정 에피소드 뷰어 페이지 ( episodeId = 0: 단편 )
    episodeViewer: (platformCode: string, identifier: string, episodeId: string | number = "0") =>
        `/${platformCode}/novels/${identifier}/episode/${episodeId}`,

    genreRankingList: (platformCode: string, genreId: string, period: string, page: number = 1) =>
        `/${platformCode}/genres/${genreId}?period=${period}&page=${page}`,

    searchNovelList: (platformCode: string, keyword: string, page: number = 1) =>
        `/${platformCode}/search/novels?keyword=${keyword}&page=${page}`,
};