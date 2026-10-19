import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Session } from "next-auth";

import { buildMobileCallback, validMobileRequestId } from "@/lib/mobileAuthPolicy";

const csrfLifetime = 300_000;
const csrfHeader = "x-translacat-mobile-csrf";
const backendErrors = new Set([
    "MOBILE_AUTH_INVALID_INPUT", "MOBILE_AUTH_REDIRECT_NOT_ALLOWED", "MOBILE_AUTH_NOT_CONFIGURED",
    "MOBILE_AUTH_EXPIRED", "MOBILE_AUTH_ALREADY_APPROVED", "MOBILE_AUTH_ALREADY_USED",
    "MOBILE_AUTH_INVALID_PROOF", "MOBILE_AUTH_RATE_LIMITED", "MOBILE_AUTH_INVALID_REQUEST",
    "MOBILE_AUTH_APPROVAL_INVALID",
]);

export class MobileApprovalError extends Error {
    constructor(public readonly code: string, public readonly status: number) {
        super(code);
        this.name = "MobileApprovalError";
    }
}

type ApprovalSession = Session & { accessToken: string; loginSessionId: string; user: { publicId: string } };

export function canApproveMobile(session: Session | null, now = Date.now()): session is ApprovalSession {
    return !!session && !session.error && typeof session.accessToken === "string" && !!session.accessToken
        && typeof session.loginSessionId === "string" && !!session.loginSessionId
        && typeof session.user?.publicId === "string" && !!session.user.publicId
        && typeof session.user.accessTokenExpires === "number" && Number.isFinite(session.user.accessTokenExpires)
        && session.user.accessTokenExpires > now;
}

function approvalSecret(): string {
    const secret = process.env.MOBILE_AUTH_APPROVAL_SECRET;
    if (!secret || Buffer.byteLength(secret, "utf8") < 32 || secret === process.env.NEXTAUTH_SECRET) {
        throw new MobileApprovalError("MOBILE_AUTH_NOT_CONFIGURED", 503);
    }
    return secret;
}

export function requireMobileApprovalConfiguration() {
    // 웹 쿠키의 secret을 BE와 공유하지 않는다. 모바일 승인 전용 키가 없으면 이 흐름만 닫는다.
    approvalSecret();
}

function signedApprovalHeaders(requestId: string, accessToken: string): Record<string, string> {
    const secret = approvalSecret();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const tokenHash = createHash("sha256").update(accessToken, "utf8").digest("hex");
    const message = ["mobile-auth-approval-v1", "POST", "/api/v1/auth/mobile/authorize", requestId, tokenHash, timestamp].join("\n");
    return {
        "X-Mobile-Approval-Timestamp": timestamp,
        "X-Mobile-Approval-Signature": createHmac("sha256", secret).update(message, "utf8").digest("hex"),
    };
}

function csrfSignature(value: string, requestId: string, session: ApprovalSession): string {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new MobileApprovalError("MOBILE_AUTH_NOT_CONFIGURED", 503);
    return createHmac("sha256", secret)
        .update(JSON.stringify(["mobile-approval-v1", value, requestId, session.user.publicId, session.loginSessionId]))
        .digest("base64url");
}

export function createMobileApprovalCsrf(requestId: string, session: ApprovalSession, now = Date.now()): string {
    if (!validMobileRequestId(requestId) || !canApproveMobile(session, now)) {
        throw new MobileApprovalError("AUTH_REQUIRED", 401);
    }
    const value = String(now + csrfLifetime) + "." + randomBytes(32).toString("base64url");
    return value + "." + csrfSignature(value, requestId, session);
}

export function requireMobileApprovalOrigin(request: Request) {
    // JSON과 필수 Origin 검사를 함께 사용해 다른 사이트의 form/fetch가 승인을 만들지 못하게 한다.
    let expected: string;
    try { expected = new URL(process.env.NEXTAUTH_URL ?? request.url).origin; }
    catch { throw new MobileApprovalError("MOBILE_AUTH_NOT_CONFIGURED", 503); }
    if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
        throw new MobileApprovalError("MOBILE_AUTH_CSRF_INVALID", 403);
    }
}

export function verifyMobileApprovalCsrf(request: Request, requestId: string, session: ApprovalSession, now = Date.now()) {
    const token = request.headers.get(csrfHeader);
    if (!token || token.length > 256) throw new MobileApprovalError("MOBILE_AUTH_CSRF_INVALID", 403);
    const parts = token.split(".");
    const expires = Number(parts[0]);
    if (parts.length !== 3 || !/^\d{13}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])
        || !/^[A-Za-z0-9_-]{43}$/.test(parts[2]) || expires <= now || expires > now + csrfLifetime) {
        throw new MobileApprovalError("MOBILE_AUTH_CSRF_INVALID", 403);
    }

    // 표시했던 계정·로그인 세션과 현재 계정이 모두 같아야 승인할 수 있다.
    const expected = csrfSignature(parts[0] + "." + parts[1], requestId, session);
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) {
        throw new MobileApprovalError("MOBILE_AUTH_CSRF_INVALID", 403);
    }
}

export async function readMobileApprovalRequest(request: Request): Promise<string> {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        throw new MobileApprovalError("MOBILE_AUTH_INVALID_INPUT", 400);
    }
    const reader = request.body?.getReader();
    if (!reader) throw new MobileApprovalError("MOBILE_AUTH_INVALID_INPUT", 400);
    const decoder = new TextDecoder();
    let length = 0;
    let text = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 1024) {
            await reader.cancel();
            throw new MobileApprovalError("MOBILE_AUTH_INVALID_INPUT", 413);
        }
        text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();

    // 요청 ID 외의 token, redirect, 계정 지정 필드는 받지 않는다.
    let body: unknown;
    try { body = JSON.parse(text); }
    catch { throw new MobileApprovalError("MOBILE_AUTH_INVALID_INPUT", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1
        || !("requestId" in body) || !validMobileRequestId(body.requestId)) {
        throw new MobileApprovalError("MOBILE_AUTH_INVALID_INPUT", 400);
    }
    return body.requestId;
}

export async function authorizeMobileApproval(requestId: string, accessToken: string): Promise<string> {
    // 단기 사용자 access만으로 장기 앱 세션을 발급하지 않도록 FE의 명시적 승인을 BE에도 증명한다.
    const proof = signedApprovalHeaders(requestId, accessToken);

    // 목적지는 서버의 기존 API 설정과 고정 endpoint로만 구성하며 redirect를 따라가지 않는다.
    let target: URL;
    try {
        const base = new URL(process.env.API_URL ?? "");
        if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
        target = new URL(base.toString().replace(/\/$/, "") + "/auth/mobile/authorize");
    } catch {
        throw new MobileApprovalError("MOBILE_AUTH_NOT_CONFIGURED", 503);
    }
    let response: Response;
    try {
        response = await fetch(target, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken, ...proof },
            body: JSON.stringify({ requestId }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
        });
    } catch {
        throw new MobileApprovalError("MOBILE_AUTH_UNAVAILABLE", 503);
    }
    const envelope = await response.json().catch(() => null);
    if (!response.ok) {
        const code = envelope?.body?.errorCode;
        throw new MobileApprovalError(typeof code === "string" && backendErrors.has(code) ? code : "MOBILE_AUTH_UNAVAILABLE",
            [400, 401, 403, 409, 410, 429, 503].includes(response.status) ? response.status : 503);
    }
    const callback = buildMobileCallback(requestId, envelope?.body);
    if (!callback) throw new MobileApprovalError("MOBILE_AUTH_UNAVAILABLE", 502);
    return callback;
}
