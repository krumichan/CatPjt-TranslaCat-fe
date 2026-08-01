import type {
    ChatRoomMemberRole,
    OpenChatMemberProfile,
} from "@/types/chat";

export type OpenChatModerationAction =
    | "ASSIGN_ADMIN"
    | "REVOKE_ADMIN"
    | "BAN";

export function getOpenChatModerationActions({
    actorRole,
    actorOpenChatMemberId,
    target,
}: {
    actorRole: ChatRoomMemberRole | null | undefined;
    actorOpenChatMemberId: number | null | undefined;
    target: OpenChatMemberProfile;
}): OpenChatModerationAction[] {
    if (
        !target.active ||
        actorOpenChatMemberId == null ||
        actorOpenChatMemberId === target.openChatMemberId
    ) {
        return [];
    }

    const actions: OpenChatModerationAction[] = [];

    if (actorRole === "OWNER") {
        if (target.role === "MEMBER") {
            actions.push("ASSIGN_ADMIN", "BAN");
        } else if (target.role === "ADMIN") {
            actions.push("REVOKE_ADMIN", "BAN");
        }
        return actions;
    }

    if (actorRole === "ADMIN" && target.role === "MEMBER") {
        actions.push("BAN");
    }

    return actions;
}

export function isOpenChatModerator(
    role: ChatRoomMemberRole | null | undefined,
): boolean {
    return role === "OWNER" || role === "ADMIN";
}
