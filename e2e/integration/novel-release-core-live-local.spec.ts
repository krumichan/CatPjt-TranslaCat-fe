import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { openNovelReleaseSession, releaseAppUrl, releaseApiUrl } from "../support/novel-release-live";

test("NOVEL-RELEASE-CORE actual BE profile, LL settings and CHAT persistence", async ({ page, context, request }) => {
    test.skip(process.env.NOVEL_RELEASE_CORE_LIVE_E2E !== "1", "Explicit local six-service core proof required; synthetic AI only");
    test.setTimeout(120_000);
    const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
    if (!path.isAbsolute(root)) throw new Error("LOCAL_CORE_EVIDENCE_REQUIRED");
    fs.mkdirSync(root, { recursive: true });
    const file = path.join(root, "actual-core-ui.json");
    if (fs.existsSync(file)) throw new Error("PRESERVE_CORE_EVIDENCE");
    const statuses: { method: string; path: string; status: number }[] = [];
    const completed: string[] = [];
    const frames: { direction: string; command: string; destination: string | null; bytes: number }[] = [];
    let failure: string | null = null;
    let roomId: number | null = null;
    let messageId: number | null = null;
    let settings: unknown = null;
    try {
        // STOMP 인증 헤더/본문은 기록하지 않고 명령과 고정 destination만 남긴다.
        page.on("websocket", socket => {
            const record = (direction: string, payload: string | Buffer) => {
                const text = typeof payload === "string" ? payload : payload.toString("utf8");
                const command = text.split("\n")[0].trim();
                const destination = /^destination:(.+)$/m.exec(text)?.[1]?.trim() ?? null;
                frames.push({ direction, command: /^(CONNECT|CONNECTED|SEND|SUBSCRIBE|ERROR|MESSAGE|DISCONNECT|RECEIPT)$/.test(command) ? command : "OTHER",
                    destination: destination && /^\/(app|topic|user)\/[\w/.-]+$/.test(destination) ? destination : null, bytes: Buffer.byteLength(text) });
            };
            socket.on("framesent", event => record("sent", event.payload));
            socket.on("framereceived", event => record("received", event.payload));
        });
        const headers = await openNovelReleaseSession(context, request, 900101);
        await page.route(`${releaseApiUrl}/**`, async route => {
            const req = route.request();
            const endpoint = new URL(req.url()).pathname;
            if ((endpoint.includes("/episodes/") || endpoint.includes("/novels/catalog")) && req.method() === "POST") {
                await route.abort(); throw new Error("CORE_NOVEL_PAID_FORBIDDEN");
            }
            if (endpoint.startsWith("/api/v1/language-learning/") && req.method() !== "GET" && req.method() !== "OPTIONS"
                && !(req.method() === "PATCH" && endpoint === "/api/v1/language-learning/settings")) {
                await route.abort(); throw new Error("CORE_LEARNING_GENERATION_FORBIDDEN");
            }
            await route.continue();
        });
        page.on("response", response => {
            if (!response.url().startsWith(releaseApiUrl)) return;
            statuses.push({ method: response.request().method(), path: new URL(response.url()).pathname, status: response.status() });
        });

        // 실행: 프로필과 저장된 LL 설정을 실제 UI로 읽고 동일 유효 설정을 정상 PATCH로 저장한다.
        const profile = await request.get(`${releaseApiUrl}/users/me/profile`, { headers }); expect(profile.ok()).toBe(true);
        const me = (await profile.json()).body;
        await page.goto(`${releaseAppUrl}/ko/settings/profile`);
        await expect(page.locator("#publicId")).toHaveValue(me.publicId);
        completed.push("actual-profile");
        await page.goto(`${releaseAppUrl}/ko/language-learning/settings`);
        await expect(page.getByTestId("language-learning-settings")).toBeVisible();
        const saved = page.waitForResponse(response => response.url() === `${releaseApiUrl}/language-learning/settings` && response.request().method() === "PATCH");
        await page.getByRole("button", { name: "설정 저장", exact: true }).click();
        const savedResponse = await saved; expect(savedResponse.ok()).toBe(true);
        settings = (await savedResponse.json()).body;
        const reread = await request.get(`${releaseApiUrl}/language-learning/settings`, { headers }); expect(reread.ok()).toBe(true);
        expect((await reread.json()).body).toEqual(settings);
        await page.reload();
        await expect(page.getByTestId("language-learning-settings")).toBeVisible();
        completed.push("actual-ll-settings-save-reload");

        // 방 준비만 정상 API를 사용하고 메시지 입력·전송·재조회는 실제 FE 경로로 검증한다.
        const created = await request.post(`${releaseApiUrl}/chat/rooms`, { headers, data: { roomType: "DIRECT", name: "Novel release local QA", memberUserIds: [900102] } });
        expect(created.ok()).toBe(true);
        roomId = (await created.json()).body.id;
        expect(Number.isSafeInteger(roomId)).toBe(true);
        await page.goto(`${releaseAppUrl}/ko/chat/rooms/${roomId}`);
        const text = `Local release integration verification message (${path.basename(root)}).`;
        await page.getByPlaceholder("메시지를 입력하세요").fill(text);
        await page.getByRole("button", { name: "메시지 전송", exact: true }).click();
        await expect(page.getByText(text, { exact: true })).toBeVisible();
        const messages = await request.get(`${releaseApiUrl}/chat/rooms/${roomId}/messages`, { headers }); expect(messages.ok()).toBe(true);
        const body = (await messages.json()).body;
        const match = body.messages.find((value: { id: number; content: string }) => value.content === text);
        expect(match).toBeTruthy(); messageId = match.id;
        await page.reload();
        await expect(page.getByText(text, { exact: true })).toBeVisible();
        completed.push("actual-chat-ui-send-persist-reload");
    } catch (error) { failure = error instanceof Error ? error.message.slice(0, 1500) : "UNKNOWN_FAILURE"; throw error; }
    finally {
        fs.writeFileSync(file, JSON.stringify({ version: 1, completed, failure, roomId, messageId, settings, statuses, frames,
            boundary: "Actual local FE/BE/LL/CHAT/MySQL. Real BE login, synthetic NextAuth packaging. No Google completion. Synthetic core AI; no OpenAI generation requested.",
            finishedAt: new Date().toISOString() }, null, 2), { flag: "wx" });
    }
});

test("NOVEL-RELEASE-AUTH anonymous and actual USER cannot access Novel", async ({ page, context, request }) => {
    test.skip(process.env.NOVEL_RELEASE_CORE_LIVE_E2E !== "1", "Explicit local six-service core proof required");
    const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
    if (!path.isAbsolute(root) || !process.env.NEXTAUTH_SECRET) throw new Error("LOCAL_CORE_EVIDENCE_REQUIRED");
    const file = path.join(root, "actual-user-boundary.json");
    if (fs.existsSync(file)) throw new Error("PRESERVE_CORE_EVIDENCE");
    let failure: string | null = null;
    let anonymousStatus: number | null = null, userStatus: number | null = null, browserStatus: number | null = null, requests = 0;
    try {
        const base = `${releaseApiUrl}/syosyetu/n2604qg/episodes/1/reader`;
        const anonymous = await request.get(base); anonymousStatus = anonymous.status(); expect(anonymousStatus).toBe(404);
        await page.goto(`${releaseAppUrl}/ko/novel/syosyetu/novels/n2604qg/episode/1`);
        await expect(page).toHaveURL(/\/login/);
        const fixture = JSON.parse(fs.readFileSync(process.env.NOVEL_CORE_USER_FILE ?? "", "utf8"));
        expect(fixture.actorId).toBe(900121);
        const tokens = fixture.login.body;
        expect(tokens.role).toBe("USER");
        const denied = await request.get(base, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
        userStatus = denied.status(); expect(userStatus).toBe(404);
        const cookie = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 1800, token: {
            sub: String(fixture.actorId), name: "Local USER QA", email: fixture.email, publicId: tokens.publicId, role: "USER",
            accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, accessTokenExpires: Date.now() + tokens.accessTokenExpiresIn * 1000,
        } });
        await context.addCookies([{ name: "next-auth.session-token", value: cookie, url: releaseAppUrl, httpOnly: true, sameSite: "Lax", secure: false }]);
        page.on("request", req => { if (req.url() === base) requests++; });
        const response = await page.goto(`${releaseAppUrl}/ko/novel/syosyetu/novels/n2604qg/episode/1`);
        browserStatus = response?.status() ?? null;
        await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
        expect(browserStatus).toBe(404); expect(requests).toBe(0);
    } catch (error) { failure = error instanceof Error ? error.message.split("\n")[0].slice(0, 400) : "UNKNOWN_FAILURE"; throw new Error(failure); }
    finally { fs.writeFileSync(file, JSON.stringify({ anonymousStatus, userStatus, browserStatus, requests, failure, realBeRole: "USER",
        boundary: "Actual BE register/login USER token; synthetic NextAuth packaging. No Google authentication.", finishedAt: new Date().toISOString() }, null, 2), { flag: "wx" }); }
});
test.use({ trace: "off", video: "off" });
