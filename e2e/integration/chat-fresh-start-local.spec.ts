import {
    expect,
    request,
    test,
    type APIRequestContext,
    type APIResponse,
    type Browser,
    type BrowserContext,
    type Page,
} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { encode } from "next-auth/jwt";

import type {
    ChatMessageListResponse,
    ChatRoomListResponse,
    ChatRoomReadResponse,
    OpenChatMemberProfile,
} from "../../src/types/chat";

// 실제 BE가 발급한 토큰으로 테스트 세션만 만든다. Google 로그인 검증은 포함하지 않는다.
// trace/video에는 인증 헤더가 담길 수 있으므로 이 로컬 시나리오에서는 수집하지 않는다.
test.use({ trace: "off", video: "off", screenshot: "off" });
test.skip(
    process.env.E2E_CHAT_FRESH_START !== "1",
    "Set E2E_CHAT_FRESH_START=1 with isolated local test accounts.",
);

type AccountKey = "A" | "B" | "C";

interface LocalAccount {
    key: AccountKey;
    userId: number;
    publicId: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
}

interface LocalSession {
    account: LocalAccount;
    context: BrowserContext;
    page: Page;
    api: APIRequestContext;
}

interface LocalConfiguration {
    appUrl: string;
    apiUrl: string;
    secret: string;
    accounts: LocalAccount[];
}

function readLocalConfiguration(): LocalConfiguration {
    // 외부 환경과 공통 친구/차단 데이터 초기화는 이 테스트의 대상이 아니다.
    if (process.env.E2E_RESET_STATE !== "0") {
        throw new Error("Chat fresh-start test requires E2E_RESET_STATE=0.");
    }

    const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
    const apiUrl = process.env.E2E_API_BASE_URL;
    const accountFile = process.env.CHAT_FRESH_START_ACCOUNTS_FILE;
    const secret = process.env.NEXTAUTH_SECRET;

    if (!apiUrl || !accountFile || !secret) {
        throw new Error("Local API URL, account file and existing NextAuth secret are required.");
    }

    for (const candidate of [appUrl, apiUrl]) {
        const url = new URL(candidate);
        if (
            url.protocol !== "http:"
            || !["localhost", "127.0.0.1"].includes(url.hostname)
            || url.username || url.password || url.search || url.hash
        ) {
            throw new Error("Chat fresh-start browser test only accepts loopback HTTP URLs.");
        }
    }

    // 계정 파일의 실제 경로를 검사하고 값이나 경로를 실패 메시지에 노출하지 않는다.
    let accounts: LocalAccount[];

    try {
        const verificationRoot = fs.realpathSync(path.resolve(
            "../.codex-workspace/verification/shared",
        ));
        const resolved = fs.realpathSync(accountFile);
        const relative = path.relative(verificationRoot, resolved);
        if (!path.isAbsolute(accountFile) || relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error();
        }

        const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as { accounts?: unknown };
        if (!Array.isArray(parsed.accounts)) throw new Error();
        accounts = parsed.accounts as LocalAccount[];
    } catch {
        throw new Error("Protected local account fixture could not be read.");
    }

    for (const key of ["A", "B", "C"] as const) {
        const matches = accounts.filter((account) => account.key === key);
        const account = matches[0];
        if (
            matches.length !== 1
            || !Number.isSafeInteger(account.userId) || account.userId <= 0
            || typeof account.publicId !== "string" || !account.publicId
            || typeof account.name !== "string" || !account.name
            || typeof account.accessToken !== "string" || !account.accessToken
            || typeof account.refreshToken !== "string" || !account.refreshToken
            || !Number.isFinite(account.accessTokenExpiresIn) || account.accessTokenExpiresIn < 300
        ) {
            throw new Error("Local account fixture is incomplete or its token lifetime is too short.");
        }
    }

    if (accounts.length !== 3 || new Set(accounts.map((account) => account.userId)).size !== 3) {
        throw new Error("Three distinct local test accounts are required.");
    }

    return { appUrl, apiUrl, secret, accounts };
}

async function responseBody<T>(response: APIResponse, operation: string): Promise<T> {
    if (!response.ok()) {
        throw new Error(`${operation} failed with HTTP ${response.status()}.`);
    }

    return ((await response.json()) as { body: T }).body;
}

async function openLocalSession(
    browser: Browser,
    configuration: LocalConfiguration,
    account: LocalAccount,
): Promise<LocalSession> {
    // BE 비밀번호 로그인 결과를 기존 NextAuth callback의 세션 형태로 감싼다.
    // 제품 인증 provider, 사용자 JWT, BE/CHAT의 인증 검증은 변경하거나 우회하지 않는다.
    const cookie = await encode({
        secret: configuration.secret,
        maxAge: 30 * 60,
        token: {
            name: account.name,
            sub: String(account.userId),
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            accessTokenExpires: Date.now() + account.accessTokenExpiresIn * 1000,
            publicId: account.publicId,
            role: "USER",
        },
    });
    const context = await browser.newContext({ baseURL: configuration.appUrl, locale: "ko-KR" });
    await context.addCookies([{
        name: "next-auth.session-token",
        value: cookie,
        url: configuration.appUrl,
        httpOnly: true,
        sameSite: "Lax",
        secure: false,
        expires: Math.floor(Date.now() / 1000) + 30 * 60,
    }]);

    const page = await context.newPage();
    const api = await request.newContext({
        baseURL: `${configuration.apiUrl.replace(/\/+$/, "")}/`,
        extraHTTPHeaders: { Authorization: `Bearer ${account.accessToken}` },
    });

    // 토큰 값을 assertion 출력에 넣지 않고 실제 공통 계정 API의 식별자만 대조한다.
    const profile = await responseBody<{ userId: number; publicId: string }>(
        await api.get("users/me/profile"),
        "Current account lookup",
    );
    expect(profile.userId).toBe(account.userId);
    expect(profile.publicId).toBe(account.publicId);

    return { account, context, page, api };
}

async function waitForConnected(page: Page): Promise<void> {
    await expect(page.getByTestId("chat-websocket-status")).toHaveText(
        "WS: CONNECTED",
        { timeout: 30_000 },
    );
}

async function joinRoom(session: LocalSession, roomId: number, nickname: string): Promise<void> {
    await session.page.goto(`/ko/chat/open/${roomId}`);
    await session.page.getByTestId("open-chat-join-button").click();
    await expect(session.page.getByTestId("open-chat-join-dialog")).toBeVisible();
    await session.page.getByLabel("방별 닉네임").fill(nickname);
    await session.page.getByTestId("open-chat-profile-submit").click();

    await expect(session.page).toHaveURL(new RegExp(`/chat/rooms/${roomId}$`));
    await waitForConnected(session.page);
}

async function sendMessage(sender: LocalSession, content: string, receivers: LocalSession[]): Promise<void> {
    await sender.page.getByPlaceholder("메시지를 입력하세요").fill(content);
    await sender.page.getByRole("button", { name: "메시지 전송", exact: true }).click();

    for (const session of [sender, ...receivers]) {
        await expect(session.page.getByText(content, { exact: true })).toBeVisible({ timeout: 30_000 });
    }
}

test("CHAT-FRESH-LOCAL real browser OPEN flow with real BE-issued tokens and test-only NextAuth session", async ({ browser }) => {
    test.setTimeout(5 * 60 * 1000);

    // 준비: 실행별 새 계정과 브라우저 context를 쓰고 기존 로그인·LL 저장소를 지우지 않는다.
    const configuration = readLocalConfiguration();
    const sessions: LocalSession[] = [];
    const suffix = Date.now().toString();
    const roomName = `Chat-fresh-${suffix}`;

    try {
        for (const account of configuration.accounts) {
            sessions.push(await openLocalSession(browser, configuration, account));
        }
        const owner = sessions.find((session) => session.account.key === "A")!;
        const member = sessions.find((session) => session.account.key === "B")!;
        const reader = sessions.find((session) => session.account.key === "C")!;

        await test.step("Fresh accounts have empty room lists through the real browser HTTP path", async () => {
            for (const session of sessions) {
                const responsePromise = session.page.waitForResponse((response) =>
                    response.request().method() === "GET"
                    && new URL(response.url()).pathname === "/api/v1/chat/rooms",
                );
                await session.page.goto("/ko/chat");
                const response = await responsePromise;

                expect(response.status()).toBe(200);
                const payload = await response.json() as { body: ChatRoomListResponse };
                expect(payload.body.chatRooms).toEqual([]);
                await expect(session.page.getByTestId("open-chat-create-link")).toBeVisible();
            }
        });

        // 실행: 생성·참여·송신은 실제 React UI와 native STOMP를 통과한다.
        await owner.page.goto("/ko/chat/open/new");
        await owner.page.getByLabel("방 이름", { exact: true }).fill(roomName);
        await owner.page.getByLabel("방 설명", { exact: true }).fill("Local fresh-start browser verification");
        await owner.page.getByLabel("최대 인원", { exact: true }).fill("5");
        await owner.page.getByLabel("방별 닉네임", { exact: true }).fill(`Owner-${suffix}`);
        await owner.page.getByTestId("open-chat-profile-submit").click();
        await owner.page.waitForURL(/\/chat\/rooms\/\d+$/);
        const roomId = Number(owner.page.url().match(/\/chat\/rooms\/(\d+)$/)?.[1]);
        expect(Number.isSafeInteger(roomId) && roomId > 0).toBe(true);
        await waitForConnected(owner.page);

        await test.step("Non-members are rejected before joining; new OPEN roles use room member identity", async () => {
            const denied = await reader.api.get(`chat/rooms/${roomId}/messages`);
            // 기존 BE BusinessException과 CHAT 메시지 경계는 업무 접근 거절을 HTTP400으로 보존한다.
            expect(denied.status()).toBe(400);
            const rejected = await denied.json() as { body: { errorCode: string } };
            expect(rejected.body.errorCode).toBe("OPEN_CHAT_MEMBER_ACCESS_DENIED");

            await joinRoom(member, roomId, `Member-${suffix}`);
            await joinRoom(reader, roomId, `Reader-${suffix}`);

            for (const session of sessions) {
                const profile = await responseBody<OpenChatMemberProfile>(
                    await session.api.get(`chat/open-rooms/${roomId}/me/profile`),
                    "OPEN profile lookup",
                );
                expect(profile.role).toBe(session === owner ? "OWNER" : "MEMBER");
                expect(profile.active).toBe(true);
                expect(profile.openChatMemberId).toBeGreaterThan(0);
            }
        });

        const firstContent = `Fresh-first-${suffix}`;
        const secondContent = `Fresh-second-${suffix}`;
        await test.step("Two browsers send and all three browsers receive real STOMP messages", async () => {
            await sendMessage(owner, firstContent, [member, reader]);
            await sendMessage(member, secondContent, [owner, reader]);
        });

        // 검증: API 보조 조회는 브라우저 송수신과 구분하여 저장 결과·cursor 계약을 확인한다.
        const messages = await responseBody<ChatMessageListResponse>(
            await owner.api.get(`chat/rooms/${roomId}/messages`),
            "Persisted messages lookup",
        );
        const first = messages.messages.find((message) => message.content === firstContent);
        const second = messages.messages.find((message) => message.content === secondContent);
        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect(second!.id).toBeGreaterThan(first!.id);

        await test.step("Seek pagination and duplicate/older read requests preserve the stored cursor and timestamp", async () => {
            const earlier = await responseBody<ChatMessageListResponse>(
                await owner.api.get(`chat/rooms/${roomId}/messages?cursorId=${second!.id}`),
                "Earlier messages lookup",
            );
            expect(earlier.messages.some((message) => message.id === first!.id)).toBe(true);
            expect(earlier.messages.every((message) => message.id < second!.id)).toBe(true);

            const current = await responseBody<ChatRoomReadResponse>(
                await reader.api.patch(`chat/rooms/${roomId}/read`, { data: { lastReadMessageId: second!.id } }),
                "Read cursor advance",
            );
            for (const candidate of [second!.id, first!.id]) {
                const repeated = await responseBody<ChatRoomReadResponse>(
                    await reader.api.patch(`chat/rooms/${roomId}/read`, { data: { lastReadMessageId: candidate } }),
                    "Read cursor no-op",
                );
                expect(repeated.lastReadMessageId).toBe(second!.id);
                expect(repeated.lastReadAt).toBe(current.lastReadAt);
                expect(repeated.unreadCount).toBe(0);
            }
        });

        await test.step("Room-list unread state clears through browser read binding and survives a reload", async () => {
            await reader.page.goto("/ko/chat");
            const thirdContent = `Fresh-unread-${suffix}`;
            await sendMessage(owner, thirdContent, [member]);
            await expect(reader.page.getByTestId(`chat-room-unread-badge-${roomId}`)).toBeVisible({ timeout: 30_000 });

            // 가시 메시지별 읽음 요청이 나뉠 수 있어 마지막 unread=0 응답까지 기다린다.
            const readResponsePromise = reader.page.waitForResponse(async (response) => {
                if (
                    response.request().method() !== "PATCH"
                    || new URL(response.url()).pathname !== `/api/v1/chat/rooms/${roomId}/read`
                    || response.status() !== 200
                ) {
                    return false;
                }

                const payload = await response.json() as { body: ChatRoomReadResponse };
                return payload.body.unreadCount === 0;
            });
            await reader.page.goto(`/ko/chat/rooms/${roomId}`);
            await reader.page.bringToFront();
            await expect(reader.page.getByText(thirdContent, { exact: true })).toBeVisible();

            const readResponse = await readResponsePromise;
            expect(readResponse.status()).toBe(200);
            const read = (await readResponse.json() as { body: ChatRoomReadResponse }).body;
            expect(read.unreadCount).toBe(0);

            await reader.page.reload();
            await waitForConnected(reader.page);
            await expect(reader.page.getByText(thirdContent, { exact: true })).toHaveCount(1);
            await reader.page.goto("/ko/chat");
            await expect(reader.page.getByText(roomName, { exact: true })).toBeVisible();
            await expect(reader.page.getByTestId(`chat-room-unread-badge-${roomId}`)).toHaveCount(0);
        });
    } finally {
        // 생성한 합성 Chat 데이터는 검증 근거로 남기고 테스트가 소유한 연결만 종료한다.
        await Promise.allSettled(sessions.map(async (session) => {
            await session.api.dispose();
            await session.context.close();
        }));
    }
});
