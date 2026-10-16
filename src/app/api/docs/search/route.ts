import { createFromSource } from "fumadocs-core/search/server";

import { guideSource } from "@/lib/docs/source";

// 공개 가이드 컬렉션만 색인하고 locale별로 검색 결과를 제한한다.
export const { GET } = createFromSource(guideSource);
