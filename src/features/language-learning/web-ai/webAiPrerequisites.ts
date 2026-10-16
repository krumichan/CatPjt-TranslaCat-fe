import type { LanguageLearningEffectiveKeywords } from "@/types/language-learning/keyword";
import type { LanguageLearningUserSetting } from "@/types/language-learning/setting";

export type WebAiPrerequisiteStatus = "loading" | "complete" | "missing" | "error";

export function hasWebAiLanguageSettings(setting: LanguageLearningUserSetting | null): boolean {
    // 폼 기본값이나 다음 학습일의 예약값은 현재 저장된 언어 설정으로 취급하지 않는다.
    return Boolean(setting?.configured && setting.originLanguage?.trim() && setting.learningLanguage?.trim());
}

export function hasWebAiEffectiveKeywords(keywords: LanguageLearningEffectiveKeywords | null): boolean {
    // 등록된 카탈로그가 아니라 서버가 반환한 오늘 유효한 출제 후보를 확인한다.
    return Boolean(keywords?.candidates.length);
}

export const LANGUAGE_LEARNING_SETUP_UPDATED = "translacat:language-learning-setup-updated";

export function notifyLanguageLearningSetupUpdated() {
    window.dispatchEvent(new Event(LANGUAGE_LEARNING_SETUP_UPDATED));
}
