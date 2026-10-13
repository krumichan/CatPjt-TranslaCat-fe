import { expect, test } from "../fixtures/mock-test";
import type { Page, WebSocketRoute } from "@playwright/test";
import { fulfillJson, mockCommonPageDependencies } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";

declare global {
    interface Window {
        voiceTestStreams: MediaStream[];
        voiceTestGain: GainNode;
        resolveVoiceTestPermission?: () => void;
    }
}

const session = {
    id: "voice-media-regression", mode: "MEDIA", sourceLanguageMode: "AUTO", targetLanguage: "ko",
    saveTranscript: true, status: "ACTIVE", title: null, processedAudioMs: 0,
    createdAt: "2026-10-12T00:00:00", channels: [{ channel: "REMOTE", status: "STREAMING" }],
};

type MediaOptions = { rightOnly?: boolean; gain?: number; delayPermission?: boolean };

async function prepare(page: Page, options: MediaOptions = {}) {
    await mockCommonPageDependencies(page);
    await page.route("**/voice/sessions?*", route => fulfillJson(route, responseDto({ items: [], nextCursor: null })));
    await page.route("**/voice/sessions", route => fulfillJson(route, responseDto(session, 201)));
    await page.route(`**/voice/sessions/${session.id}`, route => fulfillJson(route, responseDto(session)));
    await page.route("**/voice/sessions/*/channels/*/ticket", route => fulfillJson(route, responseDto({ ticket: "regression-ticket", expiresInSeconds: 30 })));
    await page.route("**/voice/sessions/*/complete", route => fulfillJson(route, responseDto({ ...session, status: "COMPLETED" })));

    // 준비: 공유 선택창만 대체하고 브라우저의 실제 Worklet·PCM 처리를 검증한다.
    await page.addInitScript(({ rightOnly = false, gain = 1, delayPermission = false }: MediaOptions) => {
        window.voiceTestStreams = [];
        const createStream = async () => {
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const volume = context.createGain();
            volume.gain.value = gain;
            window.voiceTestGain = volume;
            oscillator.connect(volume);
            const destination = context.createMediaStreamDestination();
            if (rightOnly) {
                const merger = context.createChannelMerger(2);
                const silence = context.createGain();
                silence.gain.value = 0;
                volume.connect(silence);
                silence.connect(merger, 0, 0);
                volume.connect(merger, 0, 1);
                merger.connect(destination);
            } else {
                volume.connect(destination);
            }
            oscillator.start();
            await context.resume();
            window.voiceTestStreams.push(destination.stream);
            return destination.stream;
        };
        Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
            configurable: true,
            value: () => delayPermission
                ? new Promise<MediaStream>(resolve => {
                    window.resolveVoiceTestPermission = () => { void createStream().then(resolve); };
                })
                : createStream(),
        });
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: createStream });
    }, options);
    const frames: Buffer[] = [];
    const sockets: WebSocketRoute[] = [];
    const channelFrames = { SELF: 0, REMOTE: 0 };
    const controls: { channel: string; type: string }[] = [];
    const closed: string[] = [];
    await page.routeWebSocket(/voice\/sessions\/.*\/channels\/(SELF|REMOTE)\/stream/, ws => {
        sockets.push(ws);
        const channel = ws.url().includes("/SELF/") ? "SELF" : "REMOTE";
        ws.onMessage(data => {
            if (Buffer.isBuffer(data)) {
                frames.push(data);
                channelFrames[channel] += 1;
            } else {
                controls.push({ channel, type: (JSON.parse(data) as { type: string }).type });
            }
        });
        ws.onClose(() => { closed.push(channel); });
        ws.send(JSON.stringify({ type: "STREAM_READY", sessionId: session.id, channel }));
    });
    await page.goto("/ko/voice");
    await page.getByRole("radio", { name: /^시스템 오디오(?:\s|$)/ }).click();
    return { frames, sockets, channelFrames, controls, closed };
}

async function start(page: Page, frames: Buffer[]) {
    await page.getByRole("button", { name: "번역 시작", exact: true }).click();
    await expect(page.getByText("스트리밍", { exact: true })).toBeVisible();
    await expect.poll(() => frames.length).toBeGreaterThanOrEqual(4);
}

test("VOICE-CAPTURE-01 우측 스테레오 탭 음성이 PCM에 포함된다", async ({ page }) => {
    // 준비 / 실행
    const { frames } = await prepare(page, { rightOnly: true });
    await start(page, frames);

    // 검증
    expect(frames.some(frame => frame.some(value => value !== 0))).toBe(true);
    await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", /[1-9]/);
});

test("VOICE-CAPTURE-02 공유 종료를 안내하고 스트리밍 상태에서 벗어난다", async ({ page }) => {
    // 준비
    const { frames } = await prepare(page);
    await start(page, frames);

    // 실행: 브라우저 공유 종료가 보내는 ended 이벤트를 재현한다.
    await page.evaluate(() => {
        const track = window.voiceTestStreams[0].getAudioTracks()[0];
        track.stop();
        track.dispatchEvent(new Event("ended"));
    });

    // 검증
    await expect(page.getByText("스트리밍", { exact: true })).not.toBeVisible();
    await expect(page.getByTestId("voice-input-REMOTE")).toContainText("오디오 입력이 종료되었습니다");
    await expect(page.getByRole("button", { name: "세션 종료", exact: true })).toBeEnabled();
});

test("VOICE-CAPTURE-03 서버 역압 대기 후 PCM 전송을 재개한다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);

    // 실행
    sockets[0].send(JSON.stringify({ type: "BACKPRESSURE", sessionId: session.id, channel: "REMOTE", retryAfterMs: 500, bufferedAudioMs: 200 }));
    await expect(page.getByText("전송 대기", { exact: true })).toBeVisible();
    const pausedCount = frames.length;

    // 검증
    await expect.poll(() => frames.length).toBeGreaterThan(pausedCount + 3);
    await expect(page.getByText("스트리밍", { exact: true })).toBeVisible();
});

test("VOICE-CAPTURE-04 무음·작은 입력 안내 후 정상 음량에서 회복한다", async ({ page }) => {
    // 준비 / 실행: 작은 소리와 무음도 전송 자체는 계속한다.
    const { frames } = await prepare(page, { gain: 0 });
    await start(page, frames);
    await expect(page.getByTestId("voice-input-REMOTE")).toContainText("아직 소리가 들어오지 않습니다");
    expect(frames.every(frame => frame.every(value => value === 0))).toBe(true);
    await page.evaluate(() => { window.voiceTestGain.gain.value = 0.002; });
    await expect(page.getByTestId("voice-input-REMOTE")).toContainText("입력이 작습니다");

    // 검증
    await page.evaluate(() => { window.voiceTestGain.gain.value = 0.1; });
    await expect(page.getByTestId("voice-input-REMOTE")).toContainText("소리가 들어오고 있습니다");
});

test("VOICE-CAPTURE-05 권한 대기를 취소하면 늦은 스트림을 반납한다", async ({ page }) => {
    // 준비
    let creates = 0;
    const { sockets } = await prepare(page, { delayPermission: true });
    await page.route("**/voice/sessions", route => {
        creates += 1;
        return fulfillJson(route, responseDto(session, 201));
    });

    // 실행
    await page.getByRole("button", { name: "번역 시작", exact: true }).click();
    await page.getByRole("button", { name: "준비 취소", exact: true }).click();
    await page.evaluate(() => window.resolveVoiceTestPermission?.());

    // 검증
    await expect.poll(() => page.evaluate(() => window.voiceTestStreams[0]?.getAudioTracks()[0].readyState)).toBe("ended");
    expect(creates).toBe(0);
    expect(sockets).toHaveLength(0);
    await expect(page.getByRole("button", { name: "번역 시작", exact: true })).toBeEnabled();
});

test("VOICE-CAPTURE-06 늦은 세션 생성 응답은 캡처를 시작하지 않고 종료한다", async ({ page }) => {
    // 준비
    const { sockets } = await prepare(page);
    let releaseCreate: () => void = () => {};
    const gate = new Promise<void>(resolve => { releaseCreate = resolve; });
    let createStarted = false;
    let completes = 0;
    await page.route("**/voice/sessions", async route => {
        createStarted = true;
        await gate;
        await fulfillJson(route, responseDto(session, 201));
    });
    await page.route("**/voice/sessions/*/complete", route => {
        completes += 1;
        return fulfillJson(route, responseDto({ ...session, status: "COMPLETED" }));
    });

    // 실행
    await page.getByRole("button", { name: "번역 시작", exact: true }).click();
    await expect.poll(() => createStarted).toBe(true);
    await page.getByRole("button", { name: "준비 취소", exact: true }).click();
    releaseCreate();

    // 검증
    await expect.poll(() => completes).toBe(1);
    expect(sockets).toHaveLength(0);
    await expect.poll(() => page.evaluate(() => window.voiceTestStreams[0].getAudioTracks()[0].readyState)).toBe("ended");
});

test("VOICE-CAPTURE-07 종료 요청 실패 시 로컬 캡처를 반납하고 종료를 재시도한다", async ({ page }) => {
    // 준비
    const { frames } = await prepare(page);
    let completes = 0;
    await page.route("**/voice/sessions/*/complete", route => {
        completes += 1;
        return completes === 1
            ? fulfillJson(route, responseDto(null, 503), 503)
            : fulfillJson(route, responseDto({ ...session, status: "COMPLETED" }));
    });
    await start(page, frames);

    // 실행 / 검증: 실패한 완료를 새 시작으로 덮어쓰지 않는다.
    await page.getByRole("button", { name: "세션 종료", exact: true }).click();
    await expect(page.getByText("세션 종료 처리에 실패했습니다. 다시 종료를 시도해 주세요.")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.voiceTestStreams[0].getAudioTracks()[0].readyState)).toBe("ended");
    await expect(page.getByRole("button", { name: "번역 시작", exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "세션 종료", exact: true }).click();
    await expect(page.getByText("완료", { exact: true })).toBeVisible();
    expect(completes).toBe(2);
});

test("VOICE-CAPTURE-08 미지원·불일치 언어 오류는 원문과 안내를 표시한다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);

    // 실행
    for (const [index, code] of ["VOICE_AI_UNSUPPORTED_LANGUAGE", "VOICE_AI_LANGUAGE_MISMATCH"].entries()) {
        sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_FAILED", sessionId: session.id, channel: "REMOTE",
            utteranceKey: `language-${index}`, utteranceSequence: index + 1, sourceText: `Original ${index}`,
            error: { code, stage: "LANGUAGE", retryable: false } }));
    }

    // 검증
    await expect(page.getByText("Original 0", { exact: true })).toBeVisible();
    await expect(page.getByText("Original 1", { exact: true })).toBeVisible();
    await expect(page.getByText(/지원하지 않는 입력 언어입니다/)).toBeVisible();
    await expect(page.getByText(/감지한 언어가 지정한 입력 언어와 다릅니다/)).toBeVisible();
    await expect(page.getByText("번역에 실패했습니다.", { exact: true })).not.toBeVisible();
});

test("VOICE-CAPTURE-09 공유 종료 뒤 마지막 번역을 받고 채널을 닫는다", async ({ page }) => {
    // 준비
    const { frames, sockets, controls, closed } = await prepare(page);
    await start(page, frames);

    // 실행: 입력이 끝난 뒤 서버에서 늦게 도착한 최종 번역을 재현한다.
    await page.evaluate(() => {
        const track = window.voiceTestStreams[0].getAudioTracks()[0];
        track.stop();
        track.dispatchEvent(new Event("ended"));
    });
    await expect.poll(() => controls.some(control => control.type === "STREAM_CLOSE")).toBe(true);
    expect(closed).toHaveLength(0);
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "last", utteranceSequence: 1, sourceText: "Last sentence", translatedText: "마지막 문장" }));
    sockets[0].send(JSON.stringify({ type: "STREAM_CLOSED", sessionId: session.id, channel: "REMOTE" }));

    // 검증
    await expect(page.getByText("마지막 문장", { exact: true })).toBeVisible();
    await expect.poll(() => closed.length).toBe(1);
});

test("VOICE-CAPTURE-10 회의 공유 종료 후 마이크 채널은 계속 처리한다", async ({ page }) => {
    // 준비
    const { sockets, channelFrames, controls } = await prepare(page);
    await page.getByRole("radio", { name: /^회의(?:\s|$)/ }).click();
    await page.getByRole("button", { name: "번역 시작", exact: true }).click();
    await expect(page.getByText("스트리밍", { exact: true })).toHaveCount(2);
    await expect.poll(() => channelFrames.REMOTE).toBeGreaterThan(3);

    // 실행
    await page.evaluate(() => {
        const track = window.voiceTestStreams[0].getAudioTracks()[0];
        track.stop();
        track.dispatchEvent(new Event("ended"));
    });
    await expect.poll(() => controls.some(control => control.channel === "REMOTE" && control.type === "STREAM_CLOSE")).toBe(true);
    const remote = sockets.find(socket => socket.url().includes("/REMOTE/"))!;
    remote.send(JSON.stringify({ type: "STREAM_CLOSED", sessionId: session.id, channel: "REMOTE" }));
    const selfCount = channelFrames.SELF;

    // 검증
    await expect(page.getByText("스트리밍", { exact: true })).toHaveCount(1);
    await expect.poll(() => channelFrames.SELF).toBeGreaterThan(selfCount + 3);
    expect(controls.some(control => control.channel === "SELF")).toBe(false);
});

test("VOICE-CAPTURE-11 다음 발화 partial은 이전 발화의 늦은 완료 뒤에도 유지된다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);

    // 실행
    sockets[0].send(JSON.stringify({ type: "TRANSCRIPT_PARTIAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "next", utteranceSequence: 2, sourceText: "다음 발화 중간 원문" }));
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "previous", utteranceSequence: 1, sourceText: "Previous", translatedText: "이전 발화 번역" }));

    // 검증
    await expect(page.getByText("다음 발화 중간 원문", { exact: true })).toBeVisible();
    await expect(page.getByText("이전 발화 번역", { exact: true })).toBeVisible();
});

test("VOICE-CAPTURE-18 듣는 중인 문장이 번역 목록의 같은 번호 결과로 바뀐다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);
    const listening = page.getByTestId("voice-listening-REMOTE");
    const result = page.getByTestId("voice-result-REMOTE-1");

    // 실행: 시작부터 임시 원문까지 파란 카드에서 보이고 채널 상태줄에는 중복하지 않는다.
    sockets[0].send(JSON.stringify({ type: "SPEECH_STARTED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-1", utteranceSequence: 1 }));
    await expect(listening).toContainText("음성 듣는 중");
    await expect(listening).toContainText("#1");
    await expect(listening).toHaveClass(/border-blue-400/);
    sockets[0].send(JSON.stringify({ type: "TRANSCRIPT_PARTIAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-1", utteranceSequence: 1, sourceText: "Speaking now" }));
    await expect(listening).toContainText("Speaking now");
    await expect(page.getByTestId("voice-input-REMOTE")).not.toContainText("Speaking now");

    // 검증: 확정되면 듣는 중 카드는 사라지고 같은 목록의 번역 중·완료 카드가 이어진다.
    sockets[0].send(JSON.stringify({ type: "TRANSCRIPT_FINAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-1", utteranceSequence: 1, sourceText: "Speaking now" }));
    await expect(listening).not.toBeVisible();
    await expect(result).toContainText("번역 중");
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-1", utteranceSequence: 1, sourceText: "Speaking now", translatedText: "현재 말하는 중" }));
    await expect(result).toContainText("현재 말하는 중");
    sockets[0].send(JSON.stringify({ type: "SPEECH_STARTED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-2", utteranceSequence: 2 }));
    await expect(listening).toContainText("#2");
    expect(await page.evaluate(() => {
        const current = document.querySelector('[data-testid="voice-listening-REMOTE"]');
        const completed = document.querySelector('[data-testid="voice-result-REMOTE-1"]');
        return current?.parentElement === completed?.parentElement;
    })).toBe(true);
    await page.setViewportSize({ width: 320, height: 700 });
    await expect(listening).toBeVisible();
    const bounds = await listening.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
});

test("VOICE-CAPTURE-16 재접속은 완료 문장을 유지하고 낮은 번호의 새 partial도 표시한다", async ({ page }) => {
    // 준비: 서버에 저장된 마지막 문장은 2번, 이전 연결의 임시 문장은 20번이다.
    const { frames, sockets } = await prepare(page);
    await start(page, frames);
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-2", utteranceSequence: 2, sourceText: "Saved before reconnect", translatedText: "재접속 전 저장 문장" }));
    sockets[0].send(JSON.stringify({ type: "TRANSCRIPT_PARTIAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-20", utteranceSequence: 20, sourceText: "이전 연결의 미완성 문장" }));
    await expect(page.getByText("이전 연결의 미완성 문장", { exact: true })).toBeVisible();

    // 실행: 오류로 끊긴 뒤 서버의 저장 번호에 이어지는 새 연결을 재현한다.
    sockets[0].close({ code: 1011, reason: "isolated reconnect regression" });
    await expect.poll(() => sockets.length).toBe(2);
    sockets[1].send(JSON.stringify({ type: "TRANSCRIPT_PARTIAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-3", utteranceSequence: 3, sourceText: "재접속 이후 새 문장" }));

    // 검증: 완료 행은 남고 이전 partial은 지워지며 현재 입력은 계속 보인다.
    await expect(page.getByText("재접속 전 저장 문장", { exact: true })).toBeVisible();
    await expect(page.getByText("이전 연결의 미완성 문장", { exact: true })).not.toBeVisible();
    await expect(page.getByText("재접속 이후 새 문장", { exact: true })).toBeVisible();
    await expect(page.getByText("스트리밍", { exact: true })).toBeVisible();
});

test("VOICE-CAPTURE-17 비복구 서버 저장 오류는 자동 재접속하지 않는다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);

    // 실행: BE가 명시한 STREAM 저장 오류 뒤 연결을 종료한다.
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_FAILED", sessionId: session.id, channel: "REMOTE",
        error: { code: "VOICE_BE_INTERNAL_ERROR", stage: "STREAM", retryable: false } }));
    sockets[0].close({ code: 1011, reason: "isolated fatal persistence regression" });
    await expect(page.getByText("오류", { exact: true })).toBeVisible();
    const stoppedFrames = frames.length;

    // 검증: 최초 재접속 지연 400ms를 지나도 추가 연결이나 오디오 전송이 없다.
    await page.waitForTimeout(700);
    expect(sockets).toHaveLength(1);
    expect(frames).toHaveLength(stoppedFrames);
    await expect(page.getByRole("button", { name: "세션 종료", exact: true })).toBeEnabled();
});

test("VOICE-CAPTURE-12 권한 대기 중 페이지를 떠나면 늦은 스트림을 반납한다", async ({ page }) => {
    // 준비
    let creates = 0;
    await prepare(page, { delayPermission: true });
    await page.route("**/voice/sessions", route => {
        creates += 1;
        return fulfillJson(route, responseDto(session, 201));
    });

    // 실행: 실제 앱 링크로 컴포넌트를 unmount한다.
    await page.getByRole("button", { name: "번역 시작", exact: true }).click();
    await page.getByRole("link", { name: "홈", exact: true }).first().click();
    await expect(page).toHaveURL(/\/ko\/?$/);
    await page.evaluate(() => window.resolveVoiceTestPermission?.());

    // 검증
    await expect.poll(() => page.evaluate(() => window.voiceTestStreams[0]?.getAudioTracks()[0].readyState)).toBe("ended");
    expect(creates).toBe(0);
});

test("VOICE-CAPTURE-13 페이지를 떠날 때 완료 요청과 마지막 응답 대기를 함께 진행한다", async ({ page }) => {
    // 준비
    const { frames, sockets, controls, closed } = await prepare(page);
    let completes = 0;
    await page.route("**/voice/sessions/*/complete", route => {
        completes += 1;
        return fulfillJson(route, responseDto({ ...session, status: "COMPLETED" }));
    });
    await start(page, frames);

    // 실행
    await page.getByRole("link", { name: "홈", exact: true }).first().click();
    await expect(page).toHaveURL(/\/ko\/?$/);
    await expect.poll(() => controls.some(control => control.type === "STREAM_CLOSE")).toBe(true);
    await expect.poll(() => page.evaluate(() => window.voiceTestStreams[0].getAudioTracks()[0].readyState)).toBe("ended");
    expect(closed).toHaveLength(0);
    await expect.poll(() => completes).toBe(1);
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "last", utteranceSequence: 1, sourceText: "Last sentence", translatedText: "마지막 문장" }));
    sockets[0].send(JSON.stringify({ type: "STREAM_CLOSED", sessionId: session.id, channel: "REMOTE" }));

    // 검증: 완료 요청과 병행해 마지막 서버 응답을 받고 소켓을 반납한다.
    await expect.poll(() => closed.length).toBe(1);
    await expect.poll(() => completes).toBe(1);
});

test("VOICE-CAPTURE-14 마지막 응답 없이 소켓이 닫히면 종료 결과 오류를 표시한다", async ({ page }) => {
    // 준비
    const { frames, sockets, controls } = await prepare(page);
    await start(page, frames);

    // 실행
    await page.evaluate(() => {
        const track = window.voiceTestStreams[0].getAudioTracks()[0];
        track.stop();
        track.dispatchEvent(new Event("ended"));
    });
    await expect.poll(() => controls.some(control => control.type === "STREAM_CLOSE")).toBe(true);
    sockets[0].close({ code: 1000, reason: "transport closed without acknowledgement" });

    // 검증
    await expect(page.getByText(/마지막 음성 처리 결과를 확인하지 못했습니다/)).toBeVisible();
});

test("VOICE-CAPTURE-15 서버가 실패 상태로 종료한 세션에서 새로 시작할 수 있다", async ({ page }) => {
    // 준비
    const { frames } = await prepare(page);
    await page.route("**/voice/sessions/*/complete", route => fulfillJson(route, responseDto(null, 502), 502));
    await page.route(`**/voice/sessions/${session.id}`, route => fulfillJson(route, responseDto({ ...session, status: "FAILED" })));
    await start(page, frames);

    // 실행
    await page.getByRole("button", { name: "세션 종료", exact: true }).click();

    // 검증
    await expect(page.getByText(/마지막 음성 처리 결과를 확인하지 못했습니다/)).toBeVisible();
    await expect(page.getByRole("button", { name: "번역 시작", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "세션 종료", exact: true })).not.toBeVisible();
});

test("VOICE-CAPTURE-19 종료 응답 대기 중 페이지를 떠나도 요청은 한 번이며 마지막 응답을 기다린다", async ({ page }) => {
    // 준비: 종료 버튼의 HTTP 응답을 보류한 상태에서 같은 세션의 unmount 정리를 겹친다.
    const { frames, sockets, controls, closed } = await prepare(page);
    let completes = 0;
    let releaseComplete = () => {};
    const completionGate = new Promise<void>(resolve => { releaseComplete = resolve; });
    await page.route("**/voice/sessions/*/complete", async route => {
        completes += 1;
        await completionGate;
        await fulfillJson(route, responseDto({ ...session, status: "COMPLETED" }));
    });
    await start(page, frames);

    // 실행: 종료 요청이 진행 중인 채로 페이지를 떠나고, 서버의 마지막 결과와 종료 ACK를 받는다.
    await page.getByRole("button", { name: "세션 종료", exact: true }).click();
    await expect.poll(() => completes).toBe(1);
    await page.getByRole("link", { name: "홈", exact: true }).first().click();
    await expect(page).toHaveURL(/\/ko\/?$/);
    await expect.poll(() => controls.filter(control => control.type === "STREAM_CLOSE").length).toBe(1);
    await expect.poll(() => page.evaluate(() => window.voiceTestStreams[0].getAudioTracks()[0].readyState)).toBe("ended");
    expect(closed).toHaveLength(0);
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "last", utteranceSequence: 1, sourceText: "Last sentence", translatedText: "마지막 문장" }));
    sockets[0].send(JSON.stringify({ type: "STREAM_CLOSED", sessionId: session.id, channel: "REMOTE" }));
    releaseComplete();

    // 검증: 중복 POST와 조기 소켓 종료 없이 입력 자원과 응답 대기를 모두 정리한다.
    await expect.poll(() => closed.length).toBe(1);
    expect(completes).toBe(1);
});

test("VOICE-CAPTURE-20 이미 실패한 세션의 정상 종료 응답도 실패 상태를 보존한다", async ({ page }) => {
    // 준비: 서버는 이미 끝난 FAILED 세션의 반복 종료를 HTTP 200으로 확인해 준다.
    const { frames } = await prepare(page);
    await page.route("**/voice/sessions/*/complete", route => fulfillJson(route, responseDto({ ...session, status: "FAILED" })));
    await start(page, frames);

    // 실행
    await page.getByRole("button", { name: "세션 종료", exact: true }).click();

    // 검증: 전송 성공을 번역 성공으로 표시하지 않으며 새로운 세션은 시작할 수 있다.
    await expect(page.getByText(/마지막 음성 처리 결과를 확인하지 못했습니다/)).toBeVisible();
    await expect(page.getByRole("button", { name: "새 세션 시작", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "번역 시작", exact: true })).toBeEnabled();
    await expect(page.getByText("완료", { exact: true })).not.toBeVisible();
});

test("VOICE-CAPTURE-21 인식 지연과 과부하를 구분해 표시하고 다음 발화는 계속 번역한다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);

    // 실행: 사진에서 보였던 연속 처리 실패 뒤 정상 결과가 도착하는 상황을 재현한다.
    for (const [index, code] of ["VOICE_AI_STT_TIMEOUT", "VOICE_AI_BACKPRESSURE"].entries()) {
        sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_FAILED", sessionId: session.id, channel: "REMOTE",
            utteranceKey: `REMOTE-${index + 1}`, utteranceSequence: index + 1,
            error: { code, stage: "STT", retryable: true } }));
    }
    sockets[0].send(JSON.stringify({ type: "VOICE_PIPELINE_COMPLETED", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-3", utteranceSequence: 3, sourceText: "The next sentence", translatedText: "다음 문장" }));

    // 검증: 사용자 입력 문제로 안내하지 않고 오류 구간과 정상 번역을 함께 보존한다.
    await expect(page.getByTestId("voice-result-REMOTE-1")).toContainText("음성 인식이 지연되어");
    await expect(page.getByTestId("voice-result-REMOTE-2")).toContainText("음성 인식 요청이 몰려");
    await expect(page.getByTestId("voice-result-REMOTE-3")).toContainText("다음 문장");
    await expect(page.getByText("스트리밍", { exact: true })).toBeVisible();
    await expect(page.getByText(/입력 상태를 확인한 뒤 다시 말해/)).not.toBeVisible();
});

test("VOICE-CAPTURE-22 임시 번역은 같은 카드에서 갱신되고 확정 원문 이후에는 되살아나지 않는다", async ({ page }, testInfo) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    await start(page, frames);
    const preview = page.getByTestId("voice-listening-REMOTE");
    const result = page.getByTestId("voice-result-REMOTE-1");
    const event = { type: "TRANSCRIPT_PARTIAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-1", utteranceSequence: 1, revision: 2,
        sourceText: "The shipment arrives", translatedText: "배송이 도착합니다" };

    // 실행: 역순 스냅샷을 무시하고 원문만 갱신되면 이전 임시 번역을 지운다.
    sockets[0].send(JSON.stringify(event));
    await expect(preview).toContainText("임시 번역");
    await expect(preview).toContainText("배송이 도착합니다");
    sockets[0].send(JSON.stringify({ ...event, revision: 1, translatedText: "오래된 번역" }));
    sockets[0].send(JSON.stringify({ ...event, revision: 3, sourceText: "The shipment arrives on Friday", translatedText: null }));
    await expect(preview).toContainText("The shipment arrives on Friday");
    await expect(preview).not.toContainText("배송이 도착합니다");
    await expect(preview).not.toContainText("오래된 번역");
    sockets[0].send(JSON.stringify({ ...event, revision: 4, translatedText: "배송은 금요일에 도착합니다" }));
    await expect(preview).toContainText("배송은 금요일에 도착합니다");
    await page.setViewportSize({ width: 320, height: 700 });
    const bounds = await preview.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    await preview.screenshot({ path: testInfo.outputPath("live-preview-mobile.png") });

    // 검증: 확정 원문은 임시 번역을 제거하고, 늦은 partial을 거친 뒤에도 완료 결과만 표시한다.
    sockets[0].send(JSON.stringify({ ...event, type: "TRANSCRIPT_FINAL", revision: 1,
        sourceText: "The shipment arrives on Friday.", translatedText: undefined }));
    sockets[0].send(JSON.stringify({ ...event, revision: 5 }));
    await expect(preview).not.toBeVisible();
    await expect(result).toContainText("번역 중");
    await expect(result).not.toContainText("배송이 도착합니다");
    sockets[0].send(JSON.stringify({ ...event, type: "VOICE_PIPELINE_COMPLETED", revision: 2,
        sourceText: "The shipment arrives on Friday.", translatedText: "배송은 금요일에 도착합니다." }));
    sockets[0].send(JSON.stringify({ ...event, revision: 6 }));
    await expect(result).toContainText("배송은 금요일에 도착합니다.");
    await expect(page.getByText("임시 번역", { exact: true })).not.toBeVisible();
    await expect(preview).not.toBeVisible();
});

test("VOICE-CAPTURE-23 앞 발화의 임시 번역은 다음 발화 시작과 종료 대기 사이에도 구분된다", async ({ page }) => {
    // 준비
    const { frames, sockets } = await prepare(page);
    let completes = 0;
    let releaseComplete = () => {};
    const completionGate = new Promise<void>(resolve => { releaseComplete = resolve; });
    await page.route("**/voice/sessions/*/complete", async route => {
        completes += 1;
        await completionGate;
        await fulfillJson(route, responseDto({ ...session, status: "COMPLETED" }));
    });
    await start(page, frames);
    const event = { type: "TRANSCRIPT_PARTIAL", sessionId: session.id, channel: "REMOTE",
        utteranceKey: "REMOTE-1", utteranceSequence: 1, revision: 1,
        sourceText: "First phrase", translatedText: "첫 임시 문장" };
    sockets[0].send(JSON.stringify(event));
    sockets[0].send(JSON.stringify({ ...event, utteranceKey: "REMOTE-2", utteranceSequence: 2,
        sourceText: "Next phrase", translatedText: "다음 임시 문장" }));

    // 실행 / 검증: 두 임시 카드는 서로 덮어쓰지 않으며 이전 문장은 확정 대기로 표시한다.
    const previous = page.getByTestId("voice-preview-REMOTE-1");
    await expect(previous).toContainText("확정 중");
    await expect(previous).toContainText("첫 임시 문장");
    await expect(page.getByTestId("voice-listening-REMOTE")).toContainText("다음 임시 문장");
    sockets[0].send(JSON.stringify({ ...event, revision: 2, translatedText: "수정된 첫 임시 문장" }));
    await expect(previous).toContainText("수정된 첫 임시 문장");
    sockets[0].send(JSON.stringify({ ...event, type: "NO_SPEECH" }));
    sockets[0].send(JSON.stringify({ ...event, revision: 3 }));
    await expect(previous).not.toBeVisible();
    await expect(page.getByTestId("voice-listening-REMOTE")).toContainText("다음 임시 문장");

    // 실행 / 검증: 종료 시 임시 텍스트를 이력으로 취급하지 않고 마지막 확정 결과를 받는다.
    await page.getByRole("button", { name: "세션 종료", exact: true }).click();
    await expect.poll(() => completes).toBe(1);
    sockets[0].send(JSON.stringify({ ...event, type: "VOICE_PIPELINE_COMPLETED", utteranceKey: "REMOTE-2",
        utteranceSequence: 2, sourceText: "Next phrase.", translatedText: "다음 확정 문장." }));
    sockets[0].send(JSON.stringify({ type: "STREAM_CLOSED", sessionId: session.id, channel: "REMOTE" }));
    releaseComplete();
    await expect(page.getByTestId("voice-result-REMOTE-2")).toContainText("다음 확정 문장.");
    await expect(page.getByText("임시 번역", { exact: true })).not.toBeVisible();
});
