import {useLocale} from "next-intl";

type LocalizedObject =
    | { nameJa: string; nameKo: string; nameEn?: string }
    | { ja: string; ko: string; en?: string };

export function useLocalizedName() {
    const locale = useLocale();

    return (obj: LocalizedObject) => {
        // null/undefined 방어 로직 추가
        if (!obj) return "";

        const ja = ("ja" in obj ? obj.ja : obj.nameJa) || "";
        const ko = ("ko" in obj ? obj.ko : obj.nameKo) || "";
        const en = ("en" in obj ? obj.en : "nameEn" in obj ? obj.nameEn : "") || "";

        // DB에 영어 이름이 없으면 원래 고유명을 보존한다. 영어 UI를 학습 병기로 해석하지 않는다.
        if (locale === "en") return en || ja || ko;

        // 둘 다 비어있다면 빈 문자열 반환 (줄바꿈 신호)
        if (!ja.trim() && !ko.trim()) {
            return "";
        }

        if (locale === "ko") return ko;
        if (locale === "ja") return ja;

        // learning 모드 등을 위한 처리
        return `${ja}||${ko}`;
    };
}
