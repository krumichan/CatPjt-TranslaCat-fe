import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

import type { E2ETestUser } from "./test-users";

const loginIds = new WeakMap<BrowserContext, Map<string, string>>();

export function mockLoginSessionId(
    context: BrowserContext,
    user: E2ETestUser,
    role: string,
    override?: string,
): string {
    // 같은 브라우저의 탭은 로그인 식별자를 공유하고 재로그인만 새 값으로 바꾼다.
    let sessions = loginIds.get(context);
    if (!sessions) {
        sessions = new Map();
        loginIds.set(context, sessions);
    }

    const key = `${user.publicId}:${role}`;
    const loginId = override ?? sessions.get(key) ?? randomUUID();
    sessions.set(key, loginId);

    return loginId;
}
