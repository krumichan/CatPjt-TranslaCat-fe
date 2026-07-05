import { request, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { AUTH_STATE_PATHS, type TestUserKey, TEST_USERS } from "../support/test-users";

export const REAL_E2E_ENABLED = process.env.E2E_REAL === "1";
export const RESET_REAL_STATE = process.env.E2E_RESET_STATE === "1";

const API_BASE_URL = process.env.E2E_API_BASE_URL;

export type RealUserSession = {
    key: TestUserKey;
    context: BrowserContext;
    page: Page;
    api: APIRequestContext;
    userId: number;
    publicId: string;
};

type ResponseDto<T> = { body: T };
type ProfileBody = { userId: number; publicId: string };
type FriendBody = { friend: { userId: number; publicId: string } };
type BlockBody = { blockedUser: { userId: number; publicId: string } };
type FriendRequestBody = { id: number; requesterUserId: number; receiverUserId: number; status: string };

function requireApiBaseUrl(): string {
    if (!API_BASE_URL) {
        throw new Error(
            "E2E_API_BASE_URL is required for Real Integration E2E.",
        );
    }

    return `${API_BASE_URL.replace(/\/+$/, "")}/`;
}

async function getSession(page: Page): Promise<{ accessToken: string }> {
    const response = await page.request.get("/api/auth/session");
    if (!response.ok()) throw new Error(`Failed to read NextAuth session: ${response.status()}`);
    const session = await response.json() as { accessToken?: string; user?: { accessToken?: string } };
    const accessToken = session.accessToken ?? session.user?.accessToken;
    if (!accessToken) throw new Error("Stored auth state does not contain a valid accessToken. Run npm run e2e:auth again.");
    return { accessToken };
}

async function unwrap<T>(response: import("@playwright/test").APIResponse): Promise<T> {
    if (!response.ok()) throw new Error(`API failed: ${response.url()} status=${response.status()} body=${await response.text()}`);
    const json = await response.json() as ResponseDto<T>;
    return json.body;
}

export async function openRealUser(
    browser: Browser,
    key: TestUserKey,
): Promise<RealUserSession> {
    const context = await browser.newContext({
        storageState: AUTH_STATE_PATHS[key],
    });

    const page = await context.newPage();

    const { accessToken } = await getSession(page);

    const api = await request.newContext({
        baseURL: requireApiBaseUrl(),
        extraHTTPHeaders: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    const profile = await unwrap<ProfileBody>(
        await api.get("users/me/profile"),
    );

    const expected = TEST_USERS[key].publicId;

    if (profile.publicId !== expected) {
        throw new Error(
            `Auth mismatch for ${key}: expected ${expected}, actual ${profile.publicId}`,
        );
    }

    return {
        key,
        context,
        page,
        api,
        userId: profile.userId,
        publicId: profile.publicId,
    };
}

export async function closeRealUser(session: RealUserSession): Promise<void> {
    await session.api.dispose();
    await session.context.close();
}

export async function cleanupRelations(
    sessions: RealUserSession[],
): Promise<void> {
    if (!RESET_REAL_STATE) {
        throw new Error(
            "Real state cleanup is destructive. Set E2E_RESET_STATE=1 to opt in.",
        );
    }

    const targetUserIds = new Set(
        sessions.map((session) => session.userId),
    );

    for (const session of sessions) {
        const sent = await unwrap<FriendRequestBody[]>(
            await session.api.get("friend-requests/sent"),
        );

        for (const item of sent) {
            if (
                item.status === "PENDING" &&
                targetUserIds.has(item.receiverUserId)
            ) {
                await session.api.patch(
                    `friend-requests/${item.id}/cancel`,
                );
            }
        }

        const received = await unwrap<FriendRequestBody[]>(
            await session.api.get("friend-requests/received"),
        );

        for (const item of received) {
            if (
                item.status === "PENDING" &&
                targetUserIds.has(item.requesterUserId)
            ) {
                await session.api.patch(
                    `friend-requests/${item.id}/reject`,
                );
            }
        }

        const friends = await unwrap<FriendBody[]>(
            await session.api.get("friends"),
        );

        for (const item of friends) {
            if (targetUserIds.has(item.friend.userId)) {
                await session.api.delete(
                    `friends/${item.friend.userId}`,
                );
            }
        }

        const blocks = await unwrap<BlockBody[]>(
            await session.api.get("blocks"),
        );

        for (const item of blocks) {
            if (targetUserIds.has(item.blockedUser.userId)) {
                await session.api.delete(
                    `blocks/${item.blockedUser.userId}`,
                );
            }
        }
    }
}

export async function waitForUrlRoomId(page: Page): Promise<number> {
    await page.waitForURL(/\/chat\/rooms\/\d+$/);
    const match = page.url().match(/\/chat\/rooms\/(\d+)$/);
    if (!match) throw new Error(`roomId not found in URL: ${page.url()}`);
    return Number(match[1]);
}
