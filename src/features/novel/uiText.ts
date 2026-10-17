const ko = {
    title: "작품 제목", author: "작가", synopsis: "줄거리", workList: "작품 목록",
    loadingList: "원본 목록을 가져오는 중", listError: "목록 상태를 확인하지 못했습니다", reloadList: "상태 다시 확인",
    order: "표시 순서", arrivalOrder: "준비된 순서", sourceOrder: "원래 순위·관련도", rank: "위",
    workInfo: "작품 정보", form: "작품 형식", shortStory: "단편", serial: "연재", publicationStatus: "연재 상태",
    translationFailed: "번역 실패 · 원문 표시", translating: "다시 번역 중", ready: "준비 완료", retryWork: "이 작품 다시 번역",
    periodError: "기간을 불러오지 못했습니다.", reloadPeriods: "기간 다시 불러오기",
    translationLanguage: "번역 언어", korean: "한국어", english: "영어",
};
const ja: typeof ko = {
    title: "作品名", author: "作者", synopsis: "あらすじ", workList: "作品一覧",
    loadingList: "元の一覧を取得中", listError: "一覧を取得できませんでした", reloadList: "状態を再取得",
    order: "表示順", arrivalOrder: "準備できた順", sourceOrder: "元の順位・関連度", rank: "位",
    workInfo: "作品情報", form: "作品形式", shortStory: "短編", serial: "連載", publicationStatus: "掲載状況",
    translationFailed: "翻訳失敗・原文表示", translating: "再翻訳中", ready: "準備完了", retryWork: "この作品を再試行",
    periodError: "期間を読み込めませんでした。", reloadPeriods: "期間を再取得",
    translationLanguage: "翻訳言語", korean: "韓国語", english: "英語",
};
const en: typeof ko = {
    title: "Title", author: "Author", synopsis: "Synopsis", workList: "Novels",
    loadingList: "Loading the source list", listError: "Could not load the list", reloadList: "Check again",
    order: "Sort by", arrivalOrder: "Ready first", sourceOrder: "Original rank / relevance", rank: "",
    workInfo: "Novel details", form: "Format", shortStory: "Short story", serial: "Series", publicationStatus: "Publication status",
    translationFailed: "Translation failed · showing source", translating: "Retranslating", ready: "Ready", retryWork: "Retry this novel",
    periodError: "Could not load ranking periods.", reloadPeriods: "Reload periods",
    translationLanguage: "Translation language", korean: "Korean", english: "English",
};

export function novelUiText(locale: string) {
    return locale === "en" ? en : locale === "ja" ? ja : ko;
}
