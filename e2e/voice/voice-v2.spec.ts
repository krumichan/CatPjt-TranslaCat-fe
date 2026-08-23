import { expect, test } from "../fixtures/mock-test";

import {
    fulfillJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";

const SESSION_ID = "voice-e2e-session-1";

const session = {
    id: SESSION_ID,
    mode: "MIC",
    sourceLanguageMode: "AUTO",
    targetLanguage: "ko",
    saveTranscript: true,
    status: "ACTIVE",
    title: null,
    processedAudioMs: 0,
    createdAt: "2026-08-22T10:00:00",
    startedAt: "2026-08-22T10:00:00",
    completedAt: null,
    channels: [
        {
            channel: "SELF",
            status: "STREAMING",
            manualSourceLanguage: null,
            lastLockedLanguage: null,
            reconnectCount: 0,
        },
    ],
};

async function mockVoiceApi(page: import("@playwright/test").Page) {
    const historyResponse = responseDto({ items: [], nextCursor: null });

    await page.route("**/voice/sessions?*", (route) =>
        fulfillJson(route, historyResponse),
    );
    await page.route("**/voice/sessions", async (route) => {
        if (route.request().method() === "POST") {
            await fulfillJson(route, responseDto(session, 201));
            return;
        }
        await fulfillJson(route, historyResponse);
    });

    await page.route(
        `**/voice/sessions/${SESSION_ID}/channels/SELF/ticket`,
        (route) =>
            fulfillJson(
                route,
                responseDto({ ticket: "voice-e2e-ticket", expiresInSeconds: 30 }),
            ),
    );

    await page.route(`**/voice/sessions/${SESSION_ID}/complete`, (route) =>
        fulfillJson(
            route,
            responseDto({
                ...session,
                status: "COMPLETED",
                completedAt: "2026-08-22T10:05:00",
            }),
        ),
    );
}

async function installFakeMicrophone(page: import("@playwright/test").Page) {
    await page.addInitScript(() => {
        const createStream = () => {
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const destination = context.createMediaStreamDestination();
            oscillator.connect(destination);
            oscillator.start();
            return destination.stream;
        };

        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
            configurable: true,
            value: async () => createStream(),
        });
    });
}

test.describe("Voice Translation V2", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockVoiceApi(page);
    });

    test("VOICE-V2-01 /voice는 MIC·MEDIA·MEETING 설정을 제공한다", async ({
        page,
    }) => {
        await page.goto("/voice");

        await expect(page.getByRole("heading", { name: "번역 세션 설정" })).toBeVisible();
        await expect(page.getByRole("radio", { name: /^마이크(?:\s|$)/ })).toBeVisible();
        await expect(page.getByRole("radio", { name: /^시스템 오디오(?:\s|$)/ })).toBeVisible();
        await expect(page.getByRole("radio", { name: /^회의(?:\s|$)/ })).toBeVisible();
        await expect(page.getByLabel("입력 언어")).toBeVisible();
        await expect(page.getByLabel("번역 언어")).toBeVisible();
    });

    test("VOICE-V2-02 MIC 세션은 ticket 기반 Raw WebSocket의 STREAM_READY 후 스트리밍한다", async ({
        page,
    }) => {
        await installFakeMicrophone(page);

        const requestedUrls: string[] = [];
        page.on("request", (request) => requestedUrls.push(request.url()));

        await page.routeWebSocket(/voice\/sessions\/.*\/channels\/SELF\/stream/, (ws) => {
            ws.send(
                JSON.stringify({
                    type: "STREAM_READY",
                    eventId: "voice-ready-1",
                    sessionId: SESSION_ID,
                    channel: "SELF",
                }),
            );
        });

        await page.goto("/voice");
        await page.getByRole("button", { name: "번역 시작" }).click();

        await expect(page.getByText(SESSION_ID)).toBeVisible();
        await expect(page.getByText("스트리밍", { exact: true })).toBeVisible();

        expect(
            requestedUrls.some((url) => url.includes("/voice/translate")),
        ).toBe(false);
        expect(
            requestedUrls.some((url) => url.includes("/translate/sound")),
        ).toBe(false);
    });
});
