import { defineI18n } from "fumadocs-core/i18n";
import { uiTranslations } from "fumadocs-ui/i18n";

export const guideI18n = defineI18n({
    defaultLanguage: "ko",
    languages: ["ko", "ja"],
    hideLocale: "never",
    fallbackLanguage: null,
});

export type GuideLocale = (typeof guideI18n.languages)[number];

export function isGuideLocale(locale: string): locale is GuideLocale {
    return guideI18n.languages.some((language) => language === locale);
}

export const guideTranslations = guideI18n.translations().extend(uiTranslations()).add({
    ko: {
        displayName: "한국어",
        "Search(search trigger)": "가이드 검색",
        "Search(search dialog)": "가이드 검색",
        "Open Search(search trigger)(aria-label)": "가이드 검색 열기",
        "Close Search(search dialog)(aria-label)": "검색 닫기",
        "No results found(search dialog)": "검색 결과가 없어요",
        "Search failed(search dialog)": "검색하지 못했어요. 다시 시도해 주세요.",
        "On this page(table of contents)": "이 페이지에서",
        "Table of Contents(inline table of contents)": "목차",
        "Next Page(pagination)": "다음 페이지",
        "Previous Page(pagination)": "이전 페이지",
        "Open Sidebar(sidebar)(aria-label)": "가이드 메뉴 열기",
        "Close Sidebar(sidebar)(aria-label)": "가이드 메뉴 닫기",
        "Collapse Sidebar(sidebar)(aria-label)": "가이드 메뉴 접기",
        "Toggle Menu(mobile menu)(aria-label)": "메뉴 열고 닫기",
        "Choose a language(language switcher)": "언어 선택",
        "Choose a language(language switcher)(aria-label)": "가이드 언어 선택",
        "Toggle Theme(theme switcher)(aria-label)": "화면 테마 변경",
        "Light(theme switcher)(aria-label)": "밝은 화면",
        "Dark(theme switcher)(aria-label)": "어두운 화면",
        "System(theme switcher)(aria-label)": "시스템 설정",
        "Copy Anchor Link(heading anchor)(aria-label)": "이 문단 링크 복사",
        "Copied Anchor Link(heading anchor)(aria-label)": "문단 링크를 복사했어요",
        "No Headings(table of contents)": "목차가 없어요",
        "Show Sidebar(sidebar)": "가이드 메뉴 보기",
        "Hide Sidebar(sidebar)": "가이드 메뉴 숨기기",
        "Image Viewer(image zoom)(aria-label)": "가이드 화면 확대 보기",
        "Close(image zoom)(aria-label)": "확대 화면 닫기",
        "Next Image(image zoom)(aria-label)": "다음 화면",
        "Previous Image(image zoom)(aria-label)": "이전 화면",
    },
    ja: {
        displayName: "日本語",
        "Search(search trigger)": "ガイドを検索",
        "Search(search dialog)": "ガイドを検索",
        "Open Search(search trigger)(aria-label)": "ガイド検索を開く",
        "Close Search(search dialog)(aria-label)": "検索を閉じる",
        "No results found(search dialog)": "検索結果がありません",
        "Search failed(search dialog)": "検索できませんでした。もう一度お試しください。",
        "On this page(table of contents)": "このページの内容",
        "Table of Contents(inline table of contents)": "目次",
        "Next Page(pagination)": "次のページ",
        "Previous Page(pagination)": "前のページ",
        "Open Sidebar(sidebar)(aria-label)": "ガイドメニューを開く",
        "Close Sidebar(sidebar)(aria-label)": "ガイドメニューを閉じる",
        "Collapse Sidebar(sidebar)(aria-label)": "ガイドメニューを折りたたむ",
        "Toggle Menu(mobile menu)(aria-label)": "メニューを切り替える",
        "Choose a language(language switcher)": "言語を選択",
        "Choose a language(language switcher)(aria-label)": "ガイドの言語を選択",
        "Toggle Theme(theme switcher)(aria-label)": "テーマを切り替える",
        "Light(theme switcher)(aria-label)": "ライト",
        "Dark(theme switcher)(aria-label)": "ダーク",
        "System(theme switcher)(aria-label)": "システム設定",
        "Copy Anchor Link(heading anchor)(aria-label)": "この見出しのリンクをコピー",
        "Copied Anchor Link(heading anchor)(aria-label)": "見出しのリンクをコピーしました",
        "No Headings(table of contents)": "見出しがありません",
        "Show Sidebar(sidebar)": "ガイドメニューを表示",
        "Hide Sidebar(sidebar)": "ガイドメニューを非表示",
        "Image Viewer(image zoom)(aria-label)": "ガイド画像の拡大表示",
        "Close(image zoom)(aria-label)": "拡大画像を閉じる",
        "Next Image(image zoom)(aria-label)": "次の画像",
        "Previous Image(image zoom)(aria-label)": "前の画像",
    },
});
