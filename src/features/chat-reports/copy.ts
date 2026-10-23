import type { ReportReason, ReportStatus } from "./model";

const ko = {
    message: "메시지 신고", member: "참여자 신고", close: "닫기", title: "신고 접수", reason: "신고 사유", detail: "추가 설명 (선택)",
    consent: "선택한 메시지 또는 참여자 정보가 운영 검토용 증거로 90일간 보관되는 데 동의합니다.",
    notice: "신고가 자동으로 계정 제재로 이어지지는 않습니다. 오픈채팅의 실제 계정 정보는 표시하지 않습니다.",
    send: "신고 보내기", sending: "접수 중…", resend: "동일한 신고로 다시 보내기", success: "신고를 접수했어요.",
    unknown: "접수 여부를 확인하지 못했어요. 다시 보내면 같은 요청 번호를 사용해 중복 접수를 방지합니다.",
    failed: "신고를 보내지 못했어요. 방 접근 권한과 연결 상태를 확인해 주세요.",
    confirm: "처리 내용을 확인했으며 저장합니다.", save: "처리 저장", saved: "처리 상태를 저장했어요.",
    admin: "채팅 신고 관리", adminNotice: "운영자 전용 신고 검토 화면입니다. 증거는 접수 후 90일이 지나면 삭제되며 계정 제재는 자동 실행하지 않습니다.",
    forbidden: "관리자만 접근할 수 있어요.", loading: "불러오는 중…", refresh: "새로고침", more: "더 불러오기", all: "전체 상태", empty: "접수된 신고가 없습니다.",
    select: "신고를 선택해 주세요.", evidence: "신고 증거", expired: "증거 보관 기간이 끝났어요. 원문과 표시 이름은 더 이상 제공하지 않습니다.",
    review: "처리 기록", conflict: "다른 운영자의 처리 또는 응답 유실이 있을 수 있어요. 상세를 새로 불러온 뒤 다시 확인해 주세요.",
    reasons: { SPAM: "스팸·광고", HARASSMENT: "괴롭힘·위협", HATE: "혐오·차별", SEXUAL: "성적 내용", ILLEGAL: "불법 행위", PERSONAL_INFORMATION: "개인정보 노출", OTHER: "기타" } as Record<ReportReason, string>,
    statuses: { PENDING: "접수", IN_REVIEW: "검토 중", RESOLVED: "처리 완료", DISMISSED: "기각" } as Record<ReportStatus, string>,
};
const en: typeof ko = {
    message: "Report message", member: "Report participant", close: "Close", title: "Submit a report", reason: "Reason", detail: "Additional details (optional)",
    consent: "I agree that the selected message or participant information will be kept as moderation evidence for 90 days.", notice: "Reports do not automatically suspend accounts. Real account information is not displayed for open chat participants.",
    send: "Submit report", sending: "Submitting…", resend: "Resend the same report", success: "Your report was received.", unknown: "We could not confirm receipt. Resending uses the same request ID to prevent duplicates.", failed: "The report could not be sent. Check room access and your connection.",
    confirm: "I have reviewed and confirm this update.", save: "Save review", saved: "Review status saved.", admin: "Chat reports", adminNotice: "Moderators only. Evidence is deleted 90 days after submission. Account suspensions are not automatic.",
    forbidden: "Administrator access is required.", loading: "Loading…", refresh: "Refresh", more: "Load more", all: "All statuses", empty: "No reports.", select: "Select a report.", evidence: "Report evidence", expired: "The evidence retention period has ended. Original content and display names are no longer available.",
    review: "Review note", conflict: "Another moderator may have updated this report, or the response was lost. Reload the detail before trying again.",
    reasons: { SPAM: "Spam or advertising", HARASSMENT: "Harassment or threats", HATE: "Hate or discrimination", SEXUAL: "Sexual content", ILLEGAL: "Illegal activity", PERSONAL_INFORMATION: "Personal information", OTHER: "Other" },
    statuses: { PENDING: "Pending", IN_REVIEW: "In review", RESOLVED: "Resolved", DISMISSED: "Dismissed" },
};
const ja: typeof ko = {
    message: "メッセージを通報", member: "参加者を通報", close: "閉じる", title: "通報を送信", reason: "理由", detail: "追加説明（任意）",
    consent: "選択したメッセージまたは参加者の情報を運営確認用の証拠として90日間保存することに同意します。", notice: "通報だけで自動的にアカウントが処分されることはありません。オープンチャットの実アカウント情報は表示しません。",
    send: "通報する", sending: "送信中…", resend: "同じ通報を再送", success: "通報を受け付けました。", unknown: "受付を確認できませんでした。再送時には同じリクエストIDで重複を防ぎます。", failed: "送信できませんでした。ルームへのアクセスと接続を確認してください。",
    confirm: "処理内容を確認し、保存します。", save: "処理を保存", saved: "処理状況を保存しました。", admin: "チャット通報管理", adminNotice: "運営者専用です。証拠は受付から90日後に削除されます。アカウント処分は自動では実行しません。",
    forbidden: "管理者権限が必要です。", loading: "読み込み中…", refresh: "再読み込み", more: "さらに表示", all: "すべての状況", empty: "通報はありません。", select: "通報を選択してください。", evidence: "通報の証拠", expired: "証拠の保存期間が終了しました。原文と表示名は提供されません。",
    review: "処理記録", conflict: "別の運営者による変更、または応答の紛失の可能性があります。詳細を再読み込みしてから確認してください。",
    reasons: { SPAM: "スパム・広告", HARASSMENT: "嫌がらせ・脅迫", HATE: "ヘイト・差別", SEXUAL: "性的な内容", ILLEGAL: "違法行為", PERSONAL_INFORMATION: "個人情報の露出", OTHER: "その他" },
    statuses: { PENDING: "受付", IN_REVIEW: "確認中", RESOLVED: "対応済み", DISMISSED: "却下" },
};
export function reportCopy(locale: string) { return locale === "ja" ? ja : locale === "en" ? en : ko; }
