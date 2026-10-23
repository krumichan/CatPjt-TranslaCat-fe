import type { ChatMessage } from "@/types/chat";

export function chatMessageHidden(message: ChatMessage): boolean {
    return message.contentVisibility !== undefined && message.contentVisibility !== "VISIBLE";
}

export function sanitizeChatMessage(message: ChatMessage): ChatMessage {
    // 새 숨김 응답으로 이전 원문·번역·프로필 cache를 대체한다. 알 수 없는 숨김 값도 본문을 표시하지 않는다.
    if (chatMessageHidden(message)) return {
        ...message, content: message.contentVisibility === "BLOCKED" ? "차단한 사용자의 메시지입니다." : "운영 정책에 따라 숨겨진 메시지입니다.",
        translations: [], senderUserId: null, senderAiMemberId: null, sender: null,
        senderName: null, senderEmail: null, senderProfileImageUrl: null,
    };
    if (message.authorDeleted) return {
        ...message, senderUserId: null, senderName: "탈퇴한 사용자", senderEmail: null, senderProfileImageUrl: null,
        sender: message.sender ? { ...message.sender, nickname: "탈퇴한 사용자", memberCode: "", profileImageUrl: null } : null,
    };
    return message;
}
