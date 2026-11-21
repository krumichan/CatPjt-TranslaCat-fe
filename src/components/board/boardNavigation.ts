import { ROUTES } from "@/constants/routes";
import type { BoardSort, BoardTopicType } from "@/types/board";

/** 카테고리 목록으로 돌아가도 해당 유형이 열린 상태를 유지한다. */
export function boardGroupPath(type: BoardTopicType = "MEMBER") {
    return type === "MEMBER" ? ROUTES.BOARDS : ROUTES.BOARDS + "?group=" + type;
}

/** 게시판과 글의 공유 주소에 현재 정렬을 보존한다. */
export function boardPath(forumId: string, sort: BoardSort = "LATEST", post?: string) {
    const query = new URLSearchParams({ forum: forumId });
    if (sort === "POPULAR") {
        query.set("sort", sort);
    }
    if (post) {
        query.set("post", post);
    }
    return ROUTES.BOARDS + "?" + query;
}
