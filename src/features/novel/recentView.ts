import type { RecentView } from "@/services/recentViewService";

export function recentNovelEnglishText(item: RecentView) {
    // 영어 제목이 없는 과거 기록도 원문으로 복원하며 저장된 ko 제목은 영어로 표시하지 않는다.
    return { rawJa: item.title.rawJa, ja: item.title.ja, ko: null,
        translatedText: item.titleEn ?? null, targetLanguage: "en" as const };
}
