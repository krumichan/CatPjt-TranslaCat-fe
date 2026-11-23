import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const modelPath = "../src/features/document-translation/model.ts";
const localePath = "../src/i18n/config.ts";
const loginReturnPath = "../src/features/document-translation/loginReturn.ts";
const servicePath = "../src/services/document-translation/documentTranslationService.ts";
const uuid = "354eb9d7-dcae-427c-96ab-d1b1273b1ed3";
const origin = "https://translation.example";
const fakeTransport = Symbol.for("document-fe-candidate.transport");

// 실제 TS 파일을 읽고 테스트에 필요한 모듈 경로만 메모리 안에서 연결한다.
async function sourceUrl(path, bindings = new Map()) {
    let source = await readFile(new URL(path, import.meta.url), "utf8");
    for (const [specifier, location] of bindings) {
        const before = JSON.stringify(specifier);
        assert.ok(source.includes(before), path + " import " + specifier);
        source = source.replace(before, JSON.stringify(location));
    }
    return "data:text/javascript;base64," + Buffer.from(
        stripTypeScriptTypes(source, { mode: "transform" }),
        "utf8",
    ).toString("base64");
}

// 서비스 코드에는 모의 HTTP 경계를 연결하고 실제 네트워크는 열지 않는다.
async function documentService() {
    const source = 'export const apiClient = (...args) => globalThis[Symbol.for("document-fe-candidate.transport")](...args);';
    const mock = "data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64");
    return import(await sourceUrl(servicePath, new Map([["@/lib/apiClient", mock]])));
}

test("same-origin localized document form and UUID jobs remain valid return targets", async () => {
    const config = await sourceUrl(localePath);
    const model = await sourceUrl(modelPath);
    const returns = await import(await sourceUrl(loginReturnPath, new Map([
        ["@/i18n/config", config],
        ["./model", model],
    ])));

    for (const locale of ["ko", "ja", "en", "learning"]) {
        const root = "/" + locale + "/document-translation";
        const job = root + "/jobs/" + uuid;
        assert.deepEqual(returns.parseDocumentLoginReturn(root, origin), {
            locale, href: "/document-translation", pathname: root,
        });
        assert.deepEqual(returns.parseDocumentLoginReturn(origin + job, origin), {
            locale, href: "/document-translation/jobs/" + uuid, pathname: job,
        });
    }

    // 잘못된 경로, 다른 원점과 불필요한 URL 구성 요소를 반환 대상으로 받지 않는다.
    for (const invalid of [
        null, "/ko", "/ko/document-translation/jobs/not-a-uuid", "/ko/document-translation/other",
        "/ko/document-translation?extra=1", "/ko/document-translation#unexpected", "/fr/document-translation",
        "//translation.example/ko/document-translation", "https://another.example/ko/document-translation",
        "https://user@translation.example/ko/document-translation", "/ko\\document-translation",
    ]) {
        assert.equal(returns.parseDocumentLoginReturn(invalid, origin), undefined);
    }
});

test("submit, poll, cancel and retry use existing authenticated document transport", async () => {
    const api = await documentService();
    const file = new File(["synthetic"], "sample.xlsx");
    const request = { loginSessionId: "qa-local-session", signal: new AbortController().signal };

    // 모의 수신기는 요청 키, 세션과 파일 바이트를 그대로 확인한다.
    const calls = [];
    globalThis[fakeTransport] = async (path, options, session) => {
        assert.equal(session, request.loginSessionId);
        assert.equal(options.cache, "no-store");
        assert.ok(options.signal instanceof AbortSignal);
        calls.push({ path, options });
        return Response.json({ jobId: uuid }, { status: path === "/document-translations" ? 202 : 200 });
    };
    try {
        await api.createDocumentJob({ file, sourceLanguage: "ja", targetLanguage: "en" }, "submit-key", request);
        await api.readDocumentJob(uuid, request);
        await api.cancelDocumentJob(uuid, request);
        await api.retryDocumentJob(uuid, "retry-key", request);

        const resource = "/document-translations/" + uuid;
        assert.deepEqual(calls.map((call) => call.path), ["/document-translations", resource, resource + "/cancel", resource + "/retry"]);
        assert.deepEqual(calls.map((call) => call.options.method ?? "GET"), ["POST", "GET", "POST", "POST"]);
        const body = calls[0].options.body;
        assert.ok(body instanceof FormData);
        assert.equal(body.get("file").name, "sample.xlsx");
        assert.equal(await body.get("file").text(), "synthetic");
        assert.equal(body.get("sourceLanguage"), "ja");
        assert.equal(body.get("targetLanguage"), "en");
        assert.equal(calls[0].options.headers["Idempotency-Key"], "submit-key");
        assert.equal(calls[3].options.headers["Idempotency-Key"], "retry-key");
    } finally {
        delete globalThis[fakeTransport];
    }
});

test("download accepts complete body and propagates unavailable timing", async () => {
    const api = await documentService();
    const request = { loginSessionId: "qa-local-session", signal: new AbortController().signal };

    // 같은 작업 다운로드에서 완전·부분·서버 제한 응답을 순서대로 내보낸다.
    const queue = [
        new Response("data", { status: 200, headers: { "Content-Length": "4" } }),
        new Response("da", { status: 206 }),
        Response.json({ code: "SERVICE_UNAVAILABLE" }, { status: 429, headers: { "Retry-After": "1" } }),
    ];
    globalThis[fakeTransport] = async (path, options, session) => {
        assert.equal(path, "/document-translations/" + uuid + "/download");
        assert.equal(session, request.loginSessionId);
        return queue.shift();
    };
    try {
        const job = { jobId: uuid, outputSizeBytes: 4 };
        assert.equal(await (await api.readDocumentResult(job, request)).text(), "data");
        await assert.rejects(api.readDocumentResult(job, request), { code: "INCOMPLETE_DOWNLOAD", status: 206 });
        await assert.rejects(api.readDocumentResult(job, request), (error) => {
            assert.equal(error.code, "SERVICE_UNAVAILABLE");
            assert.equal(error.status, 429);
            assert.ok(Number.isFinite(error.retryAt));
            return true;
        });
    } finally {
        delete globalThis[fakeTransport];
    }
});
