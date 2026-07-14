import fs from "node:fs";
import path from "node:path";

const projectRoot = process.argv[2];
if (!projectRoot) {
  throw new Error("Project root path is required.");
}

const patches = {
  ko: {
    chat: {
      ChatRoom: {
        header: {
          language: {
            button: "내 언어 설정",
            loading: "언어 설정 불러오는 중",
            error: "내 언어 설정 오류",
          },
        },
        languageSettings: {
          title: "이 채팅방에서의 내 언어 설정",
          description: "내가 이 채팅방에서 사용할 입력 언어, 수신 번역 언어, 원문/번역문 표시 방식을 설정합니다.",
          scopeTitle: "이 설정은 현재 채팅방에만 적용됩니다.",
          scopeDescription: "개인 기본 설정을 초기값으로 사용하지만, 여기에서 저장한 값은 다른 채팅방에 영향을 주지 않습니다.",
          defaultApplied: "아직 이 채팅방 전용 설정이 없어 개인 기본 채팅 언어 설정을 기준으로 표시하고 있습니다.",
          source: {
            ROOM_OVERRIDE: "채팅방별 내 설정 적용 중",
            DEFAULT: "개인 기본 설정 적용 중",
            SYSTEM: "시스템 기본값 적용 중",
            UNKNOWN: "적용 기준 확인 중",
          },
        },
      },
    },
    settings: {
      Settings: {
        chat: {
          title: "채팅 설정",
          description: "개인 기본 채팅 언어와 채팅방별 표시 기준을 관리합니다.",
        },
        chatPage: {
          eyebrow: "Chat Settings",
          title: "채팅 설정",
          description: "개인 기본 채팅 언어 설정을 관리합니다. 채팅방 안에서 변경한 설정은 해당 방에만 적용됩니다.",
          defaultLanguage: {
            eyebrow: "Default Language",
            title: "개인 기본 채팅 언어 설정",
            description: "신규 채팅방 또는 아직 방별 설정이 없는 채팅방에서 초기값처럼 사용할 내 기본 언어 설정입니다.",
            originalLanguage: "내 언어",
            translationLanguage: "상대 언어 / 수신 번역 언어",
            showOriginal: "원문 표시",
            showTranslation: "번역문 표시",
            defaultNotice: "저장한 기본값은 이후 새로 입장하거나 방별 설정이 없는 채팅방의 초기값으로 사용됩니다.",
            systemFallbackNotice: "개인 기본 설정 API가 아직 없거나 기본값이 저장되지 않아 시스템 기본값을 표시하고 있습니다.",
            loading: "개인 기본 채팅 언어 설정을 불러오는 중...",
            loadFailed: "개인 기본 채팅 언어 설정을 불러오지 못했습니다.",
            saveFailed: "개인 기본 채팅 언어 설정 저장에 실패했습니다.",
            saved: "개인 기본 채팅 언어 설정을 저장했습니다.",
            reload: "다시 불러오기",
            save: "저장",
            saving: "저장 중...",
          },
        },
      },
    },
  },
  ja: {
    chat: {
      ChatRoom: {
        header: {
          language: {
            button: "自分の言語設定",
            loading: "言語設定を読み込み中",
            error: "自分の言語設定エラー",
          },
        },
        languageSettings: {
          title: "このチャットルームでの自分の言語設定",
          description: "このチャットルームで使用する入力言語、受信翻訳言語、原文/翻訳文の表示方法を設定します。",
          scopeTitle: "この設定は現在のチャットルームにのみ適用されます。",
          scopeDescription: "個人デフォルト設定を初期値として使用しますが、ここで保存した値は他のチャットルームには影響しません。",
          defaultApplied: "このチャットルーム専用設定がまだないため、個人デフォルトのチャット言語設定を基準に表示しています。",
          source: {
            ROOM_OVERRIDE: "チャットルーム別の自分の設定を適用中",
            DEFAULT: "個人デフォルト設定を適用中",
            SYSTEM: "システムデフォルト値を適用中",
            UNKNOWN: "適用基準を確認中",
          },
        },
      },
    },
    settings: {
      Settings: {
        chat: {
          title: "チャット設定",
          description: "個人デフォルトのチャット言語とチャットルーム別の表示基準を管理します。",
        },
        chatPage: {
          eyebrow: "Chat Settings",
          title: "チャット設定",
          description: "個人デフォルトのチャット言語設定を管理します。チャットルーム内で変更した設定は、そのルームにのみ適用されます。",
          defaultLanguage: {
            eyebrow: "Default Language",
            title: "個人デフォルトのチャット言語設定",
            description: "新規チャットルーム、またはルーム別設定がまだないチャットルームで初期値として使用する自分の基本言語設定です。",
            originalLanguage: "自分の言語",
            translationLanguage: "相手の言語 / 受信翻訳言語",
            showOriginal: "原文を表示",
            showTranslation: "翻訳文を表示",
            defaultNotice: "保存したデフォルト値は、今後新しく入室する、またはルーム別設定がないチャットルームの初期値として使用されます。",
            systemFallbackNotice: "個人デフォルト設定APIがまだない、または基本値が保存されていないため、システムデフォルト値を表示しています。",
            loading: "個人デフォルトのチャット言語設定を読み込み中...",
            loadFailed: "個人デフォルトのチャット言語設定を読み込めませんでした。",
            saveFailed: "個人デフォルトのチャット言語設定の保存に失敗しました。",
            saved: "個人デフォルトのチャット言語設定を保存しました。",
            reload: "再読み込み",
            save: "保存",
            saving: "保存中...",
          },
        },
      },
    },
  },
};

function deepMerge(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
      continue;
    }
    target[key] = value;
  }
  return target;
}

function patchJson(filePath, patch) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  deepMerge(json, patch);
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

for (const locale of Object.keys(patches)) {
  patchJson(path.join(projectRoot, "messages", locale, "chat.json"), patches[locale].chat);
  patchJson(path.join(projectRoot, "messages", locale, "settings.json"), patches[locale].settings);
}
