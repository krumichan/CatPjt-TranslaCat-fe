const ko = {
    all: "현재 회차 전체 읽기", single: "이 문장 읽기", from: "여기부터 읽기", source: "일본어 원문", translation: "한국어 번역", parallel: "대조 보기",
    menu: "문장 메뉴", close: "닫기", copy: "텍스트 복사", copied: "복사했습니다", copyError: "복사하지 못했습니다",
    pause: "일시정지", resume: "재개", stop: "정지", previous: "이전 문장", next: "다음 문장", speed: "낭독 속도", language: "낭독 언어", follow: "읽는 문장 따라가기",
    disclosure: "OpenAI가 생성한 음성 · 현재 회차 본문만 읽습니다. 제목·서문·후기 제외.",
    translate: "전체 번역 시작", retryTranslation: "실패한 부분 다시 번역", retry: "다시 시도", loading: "원문을 불러오는 중", translating: "번역 중", complete: "전체 번역 완료", progress: "번역 완료 문장",
    sourceOnly: "원문 · 번역 대기", failed: "번역 실패 · 원문", refused: "번역이 거절되어 재시도할 수 없습니다", loadError: "원문을 불러오지 못했습니다.", translationError: "번역 상태를 확인하지 못했습니다. 표시된 본문은 유지됩니다.",
    audioError: "음성을 재생하지 못했습니다. 번역 상태·네트워크·브라우저 재생 허용을 확인하고 다시 시도하세요.", preparing: "음성 준비 중", playing: "낭독 중", paused: "일시정지됨", waitingTranslation: "다음 번역 문장 대기 중", ended: "낭독 완료", view: "본문 보기",
    progressivePartial: "확정된 문장은 보존됩니다. 실패한 문장을 선택하거나 미완료 부분을 이어 번역하세요.",
    repair: "이 문장 다시 번역", repairRemaining: "미완료 부분 이어 번역", repairing: "문장 복구 중", repairDelayed: "복구가 지연되고 있습니다. 기다리거나 작업을 중지할 수 있습니다.", cancelJob: "작업 중지", repairDone: "복구 저장 완료", repairError: "복구 요청 오류",
    recoveredEpisode: "최초 번역 시도의 실패 기록은 유지되며, 필요한 부분을 복구해 회차가 완성됐습니다.",
};
const ja: typeof ko = {
    all: "この話を全文読み上げ", single: "この文を読み上げ", from: "ここから読み上げ", source: "日本語原文", translation: "韓国語訳", parallel: "対訳表示",
    menu: "文のメニュー", close: "閉じる", copy: "テキストをコピー", copied: "コピーしました", copyError: "コピーできませんでした",
    pause: "一時停止", resume: "再開", stop: "停止", previous: "前の文", next: "次の文", speed: "読み上げ速度", language: "読み上げ言語", follow: "読み上げ中の文を追従",
    disclosure: "OpenAIによる生成音声 · この話の本文のみ。タイトル・前書き・後書きは含みません。",
    translate: "全文翻訳を開始", retryTranslation: "失敗部分を再翻訳", retry: "再試行", loading: "原文を読み込み中", translating: "翻訳中", complete: "全文翻訳完了", progress: "翻訳済みの文",
    sourceOnly: "原文 · 翻訳待ち", failed: "翻訳失敗 · 原文", refused: "翻訳が拒否されたため再試行できません", loadError: "原文を読み込めませんでした。", translationError: "翻訳状態を確認できませんでした。表示済みの本文は保持されます。",
    audioError: "音声を再生できませんでした。翻訳・ネットワーク・ブラウザーの再生許可を確認して再試行してください。", preparing: "音声を準備中", playing: "読み上げ中", paused: "一時停止中", waitingTranslation: "次の翻訳文を待機中", ended: "読み上げ完了", view: "本文表示",
    progressivePartial: "確定済みの文は保持します。失敗した文を選択するか、未完了部分を続けて翻訳してください。",
    repair: "この文を再翻訳", repairRemaining: "未完了部分を続けて翻訳", repairing: "文を復旧中", repairDelayed: "復旧に時間がかかっています。待機またはジョブの停止ができます。", cancelJob: "ジョブを停止", repairDone: "復旧の保存完了", repairError: "復旧リクエストエラー",
    recoveredEpisode: "最初の翻訳試行の失敗記録は保持され、必要な部分の復旧によりこの話が完成しました。",
};
export const readerLabels = (locale: string) => locale === "ja" ? ja : ko;
