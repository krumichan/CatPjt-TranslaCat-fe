import type { ImageLanguage, InputError, JobStatus, PageState, SourceKind } from "./model";

type Messages = {
    title: string;
    description: string;
    sources: Record<SourceKind, string>;
    languages: Record<ImageLanguage, string>;
    sourceLanguage: string;
    targetLanguage: string;
    filesHint: string;
    zipHint: string;
    linkHint: string;
    linkLabel: string;
    filesLabel: string;
    prepare: string;
    pageSelection: string;
    start: string;
    moveUp: string;
    moveDown: string;
    selectPage: string;
    page: string;
    included: string;
    finish: string;
    waiting: string;
    excluded: string;
    cancel: string;
    retry: string;
    retryRead: string;
    newJob: string;
    showTranslation: string;
    sourceText: string;
    translatedText: string;
    transcript: string;
    needsReview: string;
    noTranslation: string;
    imageUnavailable: string;
    uploadStatus: string;
    signingIn: string;
    expired: string;
    unavailable: string;
    retryReadFailed: string;
    jobNotFound: string;
    conflict: string;
    unsupportedLink: string;
    uploadFailed: string;
    rateLimit: string;
    operationFailed: string;
    inputErrors: Record<InputError, string>;
    statuses: Record<JobStatus, string>;
    pageStatuses: Record<PageState, string>;
    failures: Record<string, string>;
};

const ko: Messages = {
    title: "웹툰·이미지 번역",
    description: "이미지나 ZIP의 페이지 순서를 정하고 그림 위에 번역을 띄워 읽어 보세요.",
    sources: { FILES: "이미지", ZIP: "ZIP", LINK: "회차 링크" },
    languages: { ja: "일본어", ko: "한국어", en: "영어" },
    sourceLanguage: "원문 언어",
    targetLanguage: "번역 언어",
    filesHint: "JPEG, PNG, WebP 최대 100장. 장당 15 MiB, 합계 100 MiB.",
    zipHint: "ZIP 1개, 최대 100 MiB. 지원되는 이미지를 찾아 페이지로 정리합니다.",
    linkHint: "지원되는 공개 회차의 HTTPS 링크를 입력하세요.",
    linkLabel: "회차 URL",
    filesLabel: "파일 선택 또는 끌어놓기",
    prepare: "페이지 준비",
    pageSelection: "페이지 선택과 순서",
    start: "번역 시작",
    moveUp: "위로 이동",
    moveDown: "아래로 이동",
    selectPage: "선택",
    page: "페이지",
    included: "선택한 페이지",
    finish: "완료",
    waiting: "남음",
    excluded: "제외된 파일",
    cancel: "작업 취소",
    retry: "선택한 페이지 재시도",
    retryRead: "다시 불러오기",
    newJob: "새 번역",
    showTranslation: "이미지 위 번역 표시",
    sourceText: "원문",
    translatedText: "번역",
    transcript: "원문과 번역",
    needsReview: "확인 필요",
    noTranslation: "표시할 번역 없음",
    imageUnavailable: "이미지를 불러올 수 없습니다.",
    uploadStatus: "업로드한 파일",
    signingIn: "로그인 상태를 확인하는 중입니다.",
    expired: "이 작업 또는 업로드 주소의 유효 기간이 끝났습니다. 새 번역으로 시작해 주세요.",
    unavailable: "잠시 후 다시 시도해 주세요.",
    retryReadFailed: "최신 상태를 불러오지 못했습니다. 화면에 마지막으로 확인한 결과가 표시됩니다.",
    jobNotFound: "이 작업을 열 수 없습니다.",
    conflict: "작업 상태가 바뀌었습니다. 최신 상태를 불러온 뒤 다시 시도해 주세요.",
    unsupportedLink: "이 회차 링크는 지원되지 않습니다. 이미지나 ZIP으로 시도해 보세요.",
    uploadFailed: "파일을 전송하지 못했습니다. 선택한 파일과 연결 상태를 확인해 주세요.",
    rateLimit: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    operationFailed: "작업을 처리하지 못했습니다.",
    inputErrors: {
        fileCount: "이미지를 1장 이상 100장 이하로 선택해 주세요.",
        fileType: "선택한 입수 방식에 맞는 파일 형식과 이름을 확인해 주세요.",
        fileSize: "빈 파일이 있는지 확인하고 업로드 허용 크기 안에서 다시 선택해 주세요.",
        archiveCount: "ZIP 파일 1개를 선택해 주세요.",
        linkInvalid: "올바른 HTTPS 회차 링크를 입력해 주세요.",
        languagePair: "원문 언어와 번역 언어를 다르게 선택해 주세요.",
    },
    statuses: {
        AWAITING_UPLOAD: "파일 업로드 대기",
        PREPARING: "페이지 준비 중",
        READY: "페이지 선택 가능",
        QUEUED: "번역 대기",
        RUNNING: "번역 중",
        SUCCEEDED: "모든 페이지 완료",
        PARTIAL_FAILED: "일부 페이지 실패",
        FAILED: "작업 실패",
        CANCELLED: "취소됨",
        EXPIRED: "만료됨",
    },
    pageStatuses: {
        PENDING: "대기 중",
        RUNNING: "번역 중",
        READY: "번역 완료",
        NO_TEXT: "글자를 찾지 못했습니다.",
        FAILED: "실패",
        CANCELLED: "취소됨",
    },
    failures: {
        LINK_ASSET_UNAVAILABLE: "회차 이미지를 가져올 수 없습니다.",
        LINK_PREPARATION_INVALID: "회차 페이지 목록을 가져올 수 없습니다.",
        INVALID_IMAGE: "지원 형식이 아니거나 손상된 이미지입니다.",
        INVALID_ARCHIVE: "ZIP을 열 수 없습니다.",
        OCR_UNCERTAIN: "일부 글자를 확인하지 못했습니다.",
        TRANSLATION_TEMPORARY: "잠시 번역을 완료할 수 없습니다.",
        ASSET_STORE_TEMPORARY: "결과를 저장하지 못했습니다.",
        DISPLAY_DATA_INVALID: "표시할 결과를 준비하지 못했습니다.",
    },
};

const ja: Messages = {
    title: "漫画・画像翻訳",
    description: "画像やZIPのページ順を選んで、絵に重ねた翻訳を読めます。",
    sources: { FILES: "画像", ZIP: "ZIP", LINK: "エピソードのリンク" },
    languages: { ja: "日本語", ko: "韓国語", en: "英語" },
    sourceLanguage: "原文の言語",
    targetLanguage: "翻訳先の言語",
    filesHint: "JPEG・PNG・WebPを100枚まで。1枚15 MiB、合計100 MiBまで。",
    zipHint: "100 MiBまでのZIPを1個。対応画像をページとして読み込みます。",
    linkHint: "対応する公開エピソードのHTTPSリンクを入力してください。",
    linkLabel: "エピソードURL",
    filesLabel: "ファイルを選択またはドロップ",
    prepare: "ページを準備",
    pageSelection: "ページ選択と並べ替え",
    start: "翻訳を開始",
    moveUp: "上へ移動",
    moveDown: "下へ移動",
    selectPage: "選択",
    page: "ページ",
    included: "選択したページ数",
    finish: "完了",
    waiting: "残り",
    excluded: "除外されたファイル",
    cancel: "ジョブを取り消す",
    retry: "選択したページを再試行",
    retryRead: "再読み込み",
    newJob: "新しい翻訳",
    showTranslation: "画像に翻訳を表示",
    sourceText: "原文",
    translatedText: "翻訳",
    transcript: "原文と翻訳",
    needsReview: "要確認",
    noTranslation: "表示できる翻訳はありません。",
    imageUnavailable: "画像を読み込めませんでした。",
    uploadStatus: "アップロード済みファイル",
    signingIn: "ログイン状態を確認しています。",
    expired: "ジョブまたはアップロードURLの有効期限が切れました。新しい翻訳を開始してください。",
    unavailable: "しばらくしてから再試行してください。",
    retryReadFailed: "最新の状態を取得できませんでした。最後に取得した結果を表示しています。",
    jobNotFound: "このジョブを開けません。",
    conflict: "ジョブの状態が変わりました。最新の状態を取得してから再試行してください。",
    unsupportedLink: "このリンクには対応していません。画像かZIPでお試しください。",
    uploadFailed: "ファイルを送信できませんでした。選択したファイルと接続を確認してください。",
    rateLimit: "リクエストが集中しています。しばらくしてから再試行してください。",
    operationFailed: "処理できませんでした。",
    inputErrors: {
        fileCount: "画像を1枚以上100枚以下で選択してください。",
        fileType: "入力に対応するファイル形式と名前を確認してください。",
        fileSize: "空のファイルがないか確認し、サイズの上限内で選択してください。",
        archiveCount: "ZIPファイルを1個選択してください。",
        linkInvalid: "有効なHTTPSリンクを入力してください。",
        languagePair: "原文と翻訳先には異なる言語を選択してください。",
    },
    statuses: {
        AWAITING_UPLOAD: "アップロード待ち",
        PREPARING: "ページを準備中",
        READY: "ページを選択できます",
        QUEUED: "翻訳待ち",
        RUNNING: "翻訳中",
        SUCCEEDED: "全ページが完了しました",
        PARTIAL_FAILED: "一部のページが失敗しました",
        FAILED: "ジョブが失敗しました",
        CANCELLED: "取り消しました",
        EXPIRED: "期限切れ",
    },
    pageStatuses: {
        PENDING: "待機中",
        RUNNING: "翻訳中",
        READY: "翻訳済み",
        NO_TEXT: "文字が見つかりませんでした。",
        FAILED: "失敗",
        CANCELLED: "取り消しました",
    },
    failures: {
        LINK_ASSET_UNAVAILABLE: "エピソードの画像を取得できませんでした。",
        LINK_PREPARATION_INVALID: "エピソードのページ一覧を取得できませんでした。",
        INVALID_IMAGE: "画像の形式が未対応か、画像が破損しています。",
        INVALID_ARCHIVE: "ZIPを開けませんでした。",
        OCR_UNCERTAIN: "一部の文字を確認できませんでした。",
        TRANSLATION_TEMPORARY: "一時的に翻訳を完了できませんでした。",
        ASSET_STORE_TEMPORARY: "結果を保存できませんでした。",
        DISPLAY_DATA_INVALID: "表示する結果を準備できませんでした。",
    },
};

const en: Messages = {
    title: "Comics and image translation",
    description: "Arrange pages from images or a ZIP and read translations over the artwork.",
    sources: { FILES: "Images", ZIP: "ZIP", LINK: "Episode link" },
    languages: { ja: "Japanese", ko: "Korean", en: "English" },
    sourceLanguage: "Original language",
    targetLanguage: "Translation language",
    filesHint: "Up to 100 JPEG, PNG, or WebP images. 15 MiB each, 100 MiB total.",
    zipHint: "One ZIP up to 100 MiB. Supported images become pages.",
    linkHint: "Enter the HTTPS link to a supported public episode.",
    linkLabel: "Episode URL",
    filesLabel: "Choose or drop files",
    prepare: "Prepare pages",
    pageSelection: "Select and order pages",
    start: "Start translation",
    moveUp: "Move up",
    moveDown: "Move down",
    selectPage: "Select",
    page: "Page",
    included: "Selected pages",
    finish: "Complete",
    waiting: "Remaining",
    excluded: "Excluded files",
    cancel: "Cancel job",
    retry: "Retry selected pages",
    retryRead: "Reload",
    newJob: "New translation",
    showTranslation: "Show translations over images",
    sourceText: "Original",
    translatedText: "Translation",
    transcript: "Original and translation",
    needsReview: "Needs review",
    noTranslation: "No translation available",
    imageUnavailable: "The image couldn't be loaded.",
    uploadStatus: "Uploaded files",
    signingIn: "Checking your sign-in.",
    expired: "This job or upload link has expired. Start a new translation to continue.",
    unavailable: "Try again shortly.",
    retryReadFailed: "The latest status couldn't be loaded. Showing the last known results.",
    jobNotFound: "This job can't be opened.",
    conflict: "The job changed. Reload its latest state and try again.",
    unsupportedLink: "This episode link isn't supported. Try uploading images or a ZIP.",
    uploadFailed: "The upload failed. Check your files and connection.",
    rateLimit: "Too many requests. Try again shortly.",
    operationFailed: "The request couldn't be completed.",
    inputErrors: {
        fileCount: "Choose between 1 and 100 images.",
        fileType: "Check the file type and name for this input.",
        fileSize: "Remove empty files and choose files within the upload limit.",
        archiveCount: "Choose one ZIP file.",
        linkInvalid: "Enter a valid HTTPS episode link.",
        languagePair: "Choose different languages for the original and translation.",
    },
    statuses: {
        AWAITING_UPLOAD: "Waiting for upload",
        PREPARING: "Preparing pages",
        READY: "Pages ready to select",
        QUEUED: "Waiting to translate",
        RUNNING: "Translating",
        SUCCEEDED: "All pages complete",
        PARTIAL_FAILED: "Some pages failed",
        FAILED: "Job failed",
        CANCELLED: "Cancelled",
        EXPIRED: "Expired",
    },
    pageStatuses: {
        PENDING: "Waiting",
        RUNNING: "Translating",
        READY: "Translation complete",
        NO_TEXT: "No text detected.",
        FAILED: "Failed",
        CANCELLED: "Cancelled",
    },
    failures: {
        LINK_ASSET_UNAVAILABLE: "The episode image couldn't be fetched.",
        LINK_PREPARATION_INVALID: "The episode page list couldn't be fetched.",
        INVALID_IMAGE: "The image is unsupported or damaged.",
        INVALID_ARCHIVE: "The ZIP couldn't be opened.",
        OCR_UNCERTAIN: "Some text couldn't be confirmed.",
        TRANSLATION_TEMPORARY: "Translation is temporarily unavailable.",
        ASSET_STORE_TEMPORARY: "The result couldn't be stored.",
        DISPLAY_DATA_INVALID: "The result couldn't be prepared for display.",
    },
};

/** 도구의 표시는 현재 로케일을 따르고 학습 모드에는 일본어를 적용한다. */
export function getImageTranslationMessages(locale: string): Messages {
    if (locale === "ko") return ko;
    return locale === "en" ? en : ja;
}

export type ImageTranslationMessages = Messages;
