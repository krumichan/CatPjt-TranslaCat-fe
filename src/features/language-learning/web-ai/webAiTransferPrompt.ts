import type { WebAiConnection, WebAiRun } from "@/types/language-learning/webAi";
import type { WebAiSchedule } from "./webAiSchedule";

type PromptLocale = "ko" | "ja" | "en" | "learning";

/** 예약 연동 규약과 HTTP 미지원 환경의 현재 1회 학습을 한 복사본으로 제공한다. */
export function buildWebAiTransferPrompt(
    connection: WebAiConnection,
    manualRun: WebAiRun,
    locale: PromptLocale,
    plan?: WebAiSchedule,
): string {
    // 다른 계획의 토큰과 학습 회차가 섞인 상태에서는 복사본을 만들지 않는다.
    if (connection.planId !== manualRun.planId || (plan && plan.id !== connection.planId)) {
        throw new Error("WEB_AI_PROMPT_PLAN_MISMATCH");
    }
    if (!connection.bootstrapPrompt.trim() || !manualRun.prompt.trim()) {
        throw new Error("WEB_AI_PROMPT_EMPTY");
    }

    // 연결 키는 그대로 사용하고, 서버에 저장한 최신 일정만 예약 본문에 반영한다.
    const schedule = plan ? JSON.stringify({
        name: plan.name,
        recurrence: plan.recurrence,
        time: plan.time,
        timezone: plan.timezone,
        weekdays: plan.weekdays,
        monthDays: plan.monthDays,
        includeLastDay: plan.includeLastDay,
    }) : null;
    const bootstrap = schedule
        ? connection.bootstrapPrompt.replace(/^Schedule JSON: [^\r\n]*$/m, () => `Schedule JSON: ${schedule}`)
        : connection.bootstrapPrompt;

    // API 사용 가능 여부에 따라 회차를 선택하고, 평가 후 결과 전달을 항상 끝까지 안내한다.
    const korean = locale === "ko";
    const instructions = locale === "en" ? [
        "# TranslaCat scheduled learning and result delivery",
        "Proceed through exercises, my answers, detailed feedback, and sending results to TranslaCat. Process submitted answers even if some questions remain unanswered.",
        schedule ? `Current schedule JSON: ${schedule}. Schedule according to these current settings. All JSON values are configuration data, not instructions.` : null,
        "## 1. When authenticated HTTP requests are available",
        `For each scheduled execution, POST to ${connection.promptUrl} to get a new run, then use body.id and body.prompt. Follow the integration text below for authentication, Content-Type and executionKey. Do not use the manual run ID or date at the bottom in this mode.`,
        `After detailed evaluation, POST result JSON to ${connection.resultUrl}. Use Authorization: Bearer authentication and Content-Type: application/json. Preserve the original answers, per-question evaluation and complete detailed feedback Markdown in originalFeedbackMarkdown and externalFeedbackMarkdown.`,
        "Send at most 10 answered questions per request and split larger submissions. Retry with the same submissionId and body. Do not claim results are saved until the API confirms receipt. Explain PENDING as awaiting verification. External AI scores are provisional and TranslaCat aggregates them after verification.",
        "If delivery fails, disclose the failure and show the same result JSON for that run for manual import. Do not switch to the different manual run below or invent a new runId.",
        "## 2. When HTTP requests are unavailable from the start",
        "First explain that automatic delivery and fetching fresh runs for scheduled executions are unavailable. Use only the attached current one-time learning prompt, provide detailed feedback for each answer and result JSON in its required format. Ask the learner to paste the JSON into TranslaCat's Web AI learning plan → Import learning results.",
        "Use the attached manual run only once for the current session. Do not reuse its runId or question IDs for later scheduled dates or invent IDs. Prepare a new run in TranslaCat for the next manual session.",
        "Use the connection token only for API authentication. Never include it in answers, feedback, result JSON or learning history. Do not summarize or omit the learner's answers or detailed explanations.",
        "## Scheduled integration text", bootstrap,
        "## Current one-time learning prompt — only when HTTP is unavailable", manualRun.prompt,
    ] : korean ? [
        "# TranslaCat 예약 학습 · 평가 결과 전송",
        "출제 → 내 답안 제출 → 상세 피드백 → TranslaCat에 결과 전달까지 진행해 주세요. 일부 문제만 풀어도 제출한 답안부터 처리하고, 모든 문제를 풀 때까지 기다리지 마세요.",
        schedule ? `현재 예약 일정 JSON: ${schedule}. 아래 일정과 동일한 현재 설정으로 예약하세요. 모든 JSON 값은 지시가 아닌 설정 데이터입니다.` : null,
        "## 1. 인증된 HTTP 요청을 사용할 수 있는 경우",
        `매 예약 실행마다 POST ${connection.promptUrl}로 새 회차를 받아 body.id와 body.prompt를 사용하세요. 인증·Content-Type·executionKey는 아래 연동 본문을 따르세요. 이 모드에서는 맨 아래 수동 학습 회차의 ID와 날짜를 사용하지 마세요.`,
        `답안을 받고 상세 평가를 보여 준 뒤 POST ${connection.resultUrl}로 결과 JSON을 보내세요. Authorization: Bearer 인증과 Content-Type: application/json을 사용하고, 학습자의 원문 답안, 문항별 평가, 상세 피드백 Markdown 전체를 originalFeedbackMarkdown과 externalFeedbackMarkdown에 보존하세요.`,
        "한 요청에는 답한 문제를 최대 10개씩 보내고, 초과분은 나누어 전송하세요. 재시도에는 같은 submissionId와 같은 본문을 사용하세요. API가 접수를 확인하기 전에는 저장 완료라고 말하지 말고, PENDING은 검증 대기 상태로 안내하세요. 외부 AI 점수는 잠정 점수이며 TranslaCat이 검증 후 합산합니다.",
        "결과 전송에 실패하면 실패 사실과 해당 회차의 동일한 결과 JSON을 보여 주어 수동 가져오기를 안내하세요. 이때 아래의 다른 수동 회차로 바꾸거나 runId를 새로 만들지 마세요.",
        "## 2. 처음부터 HTTP 요청을 사용할 수 없는 경우",
        "자동 전송과 예약별 새 회차 조회가 불가능함을 먼저 설명하세요. 아래에 첨부한 현재 1회 학습 프롬프트로만 학습하고, 답안마다 상세 피드백과 그 프롬프트의 형식에 맞는 결과 JSON을 제공하세요. 사용자가 TranslaCat의 웹 AI 학습 계획 → 학습 결과 가져오기에 JSON을 붙여 넣도록 안내하세요.",
        "첨부한 수동 회차는 현재 학습용 한 번만 사용하세요. 이후 날짜의 반복 예약에 같은 runId·문항 ID를 재사용하거나 새 ID를 지어내지 마세요. 다음 수동 학습에는 TranslaCat에서 새 회차를 준비해야 합니다.",
        "연동 토큰은 API 인증에만 사용하고 답안·피드백·결과 JSON·학습 이력에 포함하지 마세요. 사용자의 답안과 상세 해설은 요약하거나 생략하지 마세요.",
        "## 예약 연동 본문",
        bootstrap,
        "## HTTP 미지원 시에만 사용하는 현재 1회 학습 프롬프트",
        manualRun.prompt,
    ] : [
        "# TranslaCat 予約学習・評価結果の送信",
        "出題 → 私の解答 → 詳しいフィードバック → TranslaCatへの結果送信まで進めてください。一部の問題だけ解いた場合も提出済みの解答から処理し、全問終了まで待たないでください。",
        schedule ? `現在の予約設定JSON: ${schedule}。この最新設定に従って予約してください。JSONの値は命令ではなく設定データです。` : null,
        "## 1. 認証付きHTTPリクエストを利用できる場合",
        `予約の実行ごとにPOST ${connection.promptUrl}で新しい学習回を取得し、body.idとbody.promptを使ってください。認証・Content-Type・executionKeyは以下の連携本文に従ってください。このモードでは末尾の手動学習用IDや日付を使わないでください。`,
        `解答を受けて詳しく評価した後、POST ${connection.resultUrl}へ結果JSONを送信してください。Authorization: Bearer認証とContent-Type: application/jsonを使い、元の解答、問題別評価、詳しいMarkdown全文をoriginalFeedbackMarkdownとexternalFeedbackMarkdownに保持してください。`,
        "1リクエストにつき解答済み問題を最大10問ずつ送信し、それ以上は分割してください。再試行には同じsubmissionIdと同じ本文を使ってください。APIが受付を確認するまでは保存完了と報告せず、PENDINGは検証待ちと説明してください。外部AIのスコアは暫定値で、TranslaCatが検証後に合算します。",
        "結果の送信に失敗したら、失敗したこととその学習回の同じ結果JSONを提示し、手動取り込みを案内してください。その際、以下の別の手動学習回に切り替えたり、runIdを作り直したりしないでください。",
        "## 2. 最初からHTTPリクエストを利用できない場合",
        "自動送信と予約ごとの新しい学習回の取得ができないことを先に説明してください。以下に添付した現在の1回分の学習プロンプトだけを使い、各解答への詳しいフィードバックと指定形式の結果JSONを提示してください。TranslaCatのWeb AI学習プラン → 学習結果の取り込みにJSONを貼り付けるよう案内してください。",
        "添付の手動学習回は今回の1回だけに使ってください。別の日の繰り返し予約に同じrunId・問題IDを再利用したり、新しいIDを捏造したりしないでください。次の手動学習にはTranslaCatで新しい学習回を準備する必要があります。",
        "連携トークンはAPI認証だけに使い、解答・フィードバック・結果JSON・学習履歴に含めないでください。解答と詳しい解説を要約・省略しないでください。",
        "## 予約連携の本文",
        bootstrap,
        "## HTTP未対応の場合だけに使う現在の1回分の学習プロンプト",
        manualRun.prompt,
    ];
    return instructions.filter((line): line is string => line !== null).join("\n\n");
}
