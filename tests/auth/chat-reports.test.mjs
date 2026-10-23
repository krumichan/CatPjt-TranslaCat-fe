import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as model from "../../src/features/chat-reports/model.ts";

const operationId = "714d5b48-0215-4f51-b74d-21777c2f401e";
const receipt = { id: 7, roomId: 3, targetType: "MESSAGE", reason: "SPAM", status: "PENDING", createdAt: "2026-10-23T00:00:00Z", evidenceExpiresAt: "2027-01-21T00:00:00.123456Z", duplicate: false, version: 0, evidenceExpired: false };
const detail = { ...receipt, detail: "synthetic report", evidenceContent: "synthetic evidence", evidenceSenderDisplay: "OPEN nickname", reviewNote: null, updatedAt: receipt.createdAt };

test("report targets project only one identifier and never send display/account metadata", () => {
    // 준비·실행
    const open = model.createReportRequest({ roomId: 3, targetType: "MEMBER", targetOpenChatMemberId: 91, displayName: "OPEN nickname", email: "private@example.test" }, "SPAM", " explanation ", operationId);
    const message = model.createReportRequest({ roomId: 3, targetType: "MESSAGE", messageId: 8, displayName: "AI" }, "OTHER", "", operationId);

    // 검증: OPEN 대상에 전역 사용자 번호를 보내거나 여러 대상을 추측하지 않는다.
    assert.deepEqual(open, { targetType: "MEMBER", targetOpenChatMemberId: 91, reason: "SPAM", detail: "explanation", clientRequestId: operationId });
    assert.equal(message.messageId, 8);
    for (const target of [
        { targetType: "MEMBER", targetOpenChatMemberId: 91, targetUserId: 1 },
        { targetType: "MESSAGE", messageId: 8, targetUserId: 1 },
        { targetType: "MESSAGE", targetUserId: 1 },
        { targetType: "MEMBER", targetUserId: Number.MAX_SAFE_INTEGER + 1 },
    ]) assert.throws(() => model.createReportRequest({ roomId: 3, displayName: "test", ...target }, "SPAM", "", operationId));
    assert.throws(() => model.createReportRequest({ roomId: 3, targetType: "MESSAGE", messageId: 8, displayName: "test" }, "SPAM", "x".repeat(2001), operationId));
    assert.throws(() => model.createReportRequest({ roomId: 3, targetType: "MESSAGE", messageId: 8, displayName: "test" }, "SPAM", "", operationId.toUpperCase()));
});

test("expired evidence is discarded even when a delayed server response still contains it", () => {
    // 준비·실행
    const result = model.parseReportDetail({ ...detail, senderUserId: 999, email: "private@example.test" }, Date.parse("2027-01-22T00:00:00Z"));

    // 검증
    assert.equal(result.evidenceExpired, true);
    assert.equal(result.evidenceContent, null);
    assert.equal(result.evidenceSenderDisplay, null);
    assert.equal("senderUserId" in result, false);
    assert.equal("email" in result, false);
    assert.equal(model.parseReportDetail({ ...detail, evidenceExpired: true }, 0).evidenceContent, null);
});

test("report response parser rejects unsafe identifiers, statuses, revisions and cursor loops", () => {
    // 준비·실행·검증
    for (const invalid of [{ id: "7" }, { roomId: -1 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { version: -1 }, { status: "SUSPENDED" }, { evidenceExpiresAt: "not-a-date" }]) {
        assert.throws(() => model.parseReportReceipt({ ...receipt, ...invalid }));
    }
    assert.throws(() => model.parseReportList({ reports: [receipt, receipt], hasNext: false, nextCursorId: null }));
    assert.throws(() => model.parseReportList({ reports: [receipt], hasNext: true, nextCursorId: null }));
    assert.equal(model.parseReportList({ reports: [receipt], hasNext: false, nextCursorId: null }).reports.length, 1);
});

function harness(result, status = 200, hanging = false) {
    const calls = [];
    const timers = [];
    const source = fs.readFileSync(new URL("../../src/services/chat/chatReportService.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, AbortController, URLSearchParams, setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout: () => {}, JSON, Error, Number, require: name => {
        if (name === "@/features/chat-reports/model") return model;
        assert.equal(name, "@/lib/apiClient");
        return { apiClient: async (...args) => { calls.push(args); if (hanging) return new Promise(() => {}); return { ok: status === 200, status, json: async () => ({ body: result }) }; } };
    } });
    const controller = new AbortController();
    return { service: exports.chatReportService, calls, timers, controller, context: { owner: "synthetic-login-session", signal: controller.signal } };
}

test("report submission is session-owned, no-store and never auto-retries a failed mutation", async () => {
    // 준비
    const f = harness(null, 503);
    const body = model.createReportRequest({ roomId: 3, targetType: "MESSAGE", messageId: 8, displayName: "AI" }, "SPAM", "", operationId);

    // 실행
    await assert.rejects(f.service.create(3, body, f.context));

    // 검증: 응답 유실에도 같은 요청을 UI에서 명시적으로 재전송하기 전 두 번째 송신은 없다.
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0][0], "/chat/rooms/3/reports");
    assert.equal(f.calls[0][1].cache, "no-store");
    assert.equal(f.calls[0][2], "synthetic-login-session");
    assert.equal(JSON.parse(f.calls[0][1].body).clientRequestId, operationId);
});

test("admin review requires a valid revision and rejects an unrelated or stale result", async () => {
    // 준비
    const f = harness({ ...detail, version: 1, status: "IN_REVIEW" });

    // 실행
    const result = await f.service.review(7, "IN_REVIEW", " note ", 0, f.context);

    // 검증
    assert.equal(result.version, 1);
    assert.equal(f.calls[0][0], "/admin/chat/reports/7/status");
    assert.deepEqual(JSON.parse(f.calls[0][1].body), { status: "IN_REVIEW", reviewNote: "note", expectedVersion: 0 });
    const stale = harness(detail);
    await assert.rejects(stale.service.review(7, "IN_REVIEW", "", 0, stale.context));
    const foreign = harness({ ...detail, id: 8, version: 1 });
    await assert.rejects(foreign.service.review(7, "IN_REVIEW", "", 0, foreign.context));
    const invalid = harness(detail);
    await assert.rejects(invalid.service.review(7, "SUSPENDED", "", 0, invalid.context));
    await assert.rejects(invalid.service.review(7, "IN_REVIEW", "", -1, invalid.context));
    assert.equal(invalid.calls.length, 0);
});

test("deadline and account-lifetime abort release a caller even if a transport ignores abort", async () => {
    // 준비
    const body = model.createReportRequest({ roomId: 3, targetType: "MESSAGE", messageId: 8, displayName: "AI" }, "SPAM", "", operationId);
    const deadline = harness(null, 200, true);
    const cancelled = harness(null, 200, true);

    // 실행: 가짜 transport는 영원히 기다리며 실제 네트워크나 15초 대기를 사용하지 않는다.
    const first = deadline.service.create(3, body, deadline.context);
    deadline.timers[0]();
    const second = cancelled.service.create(3, body, cancelled.context);
    cancelled.controller.abort();

    // 검증: 둘 다 동일 mutation을 재시도하지 않고 화면 호출자에게 종료를 전달한다.
    await assert.rejects(first, { name: "AbortError" });
    await assert.rejects(second, { name: "AbortError" });
    assert.equal(deadline.calls.length, 1);
    assert.equal(cancelled.calls.length, 1);
});
