import type { NextRequest } from "next/server";

import { authJson, authRouteError, readAuthRequest, requireAuthSession, requireSameOrigin } from "@/lib/authRouteHelpers";
import { clearAuthCookie, clearGoogleFlow, DELETION_REAUTH_COOKIE, GOOGLE_FLOW_COOKIE, readAuthCookie, writeAuthCookie } from "@/lib/authFlowCookies";
import type { GoogleReauthContext } from "@/lib/authFlowCookies";
import { sameAuthSession } from "@/lib/authPolicy";
import { AuthRequestError, requestServerAuth } from "@/services/authService";
import { parseDeletionReceipt, parseDeletionStatus, RECEIPT_PATTERN, UUID_PATTERN } from "@/features/account-deletion/contracts";
import { locales } from "@/i18n/config";
import type { GoogleAccountIntent } from "@/types/auth";

type Context = { params: Promise<{ path: string[] }> };

export async function POST(request: NextRequest, context: Context) {
    try {
        requireSameOrigin(request);
        const path = (await context.params).path.join("/");
        const body = await readAuthRequest(request);

        // 탈퇴 뒤에는 로그인 없이 영수증 소유자에게 최소 처리 상태만 제공한다.
        if (path === "status") {
            if (typeof body.operationId !== "string" || !UUID_PATTERN.test(body.operationId)
                || typeof body.receiptSecret !== "string" || !RECEIPT_PATTERN.test(body.receiptSecret)) throw new AuthRequestError("INVALID_REQUEST", 400);
            const result = await requestServerAuth("/account-deletion/status", { operationId: body.operationId, receiptSecret: body.receiptSecret });
            return authJson(parseDeletionStatus(result.body, body.operationId));
        }

        const session = await requireAuthSession();
        const proof = await readAuthCookie<GoogleReauthContext>(DELETION_REAUTH_COOKIE, request.cookies.get(DELETION_REAUTH_COOKIE)?.value);
        const ready = !!proof && proof.validUntil > Date.now() && sameAuthSession(proof, session);
        if (path === "proof/status") return authJson({ ready, expiresAt: ready ? proof.validUntil : null });
        if (path === "proof/cancel") {
            const response = authJson({ canceled: true });
            clearAuthCookie(response, DELETION_REAUTH_COOKIE);
            clearGoogleFlow(response);
            return response;
        }

        // 비밀번호/Google 증명은 삭제 전용이며 HttpOnly cookie 밖으로 돌려주지 않는다.
        if (path === "proof/password") {
            if (typeof body.password !== "string" || !body.password || body.password.length > 256) throw new AuthRequestError("INVALID_REQUEST", 400);
            const result = await requestServerAuth<{ reauthenticationToken: string; expiresIn: number }>("/users/me/deletion-reauthentication/password", { password: body.password }, session.accessToken);
            if (!result.body.reauthenticationToken || !Number.isFinite(result.body.expiresIn) || result.body.expiresIn <= 0) throw new AuthRequestError("AUTH_UNAVAILABLE", 502);
            const response = authJson({ ready: true });
            await writeAuthCookie(response, DELETION_REAUTH_COOKIE, {
                reauthToken: result.body.reauthenticationToken, publicId: session.user.publicId!, loginSessionId: session.loginSessionId!,
                validUntil: Date.now() + Math.min(result.body.expiresIn, 300) * 1000,
            }, 300);
            return response;
        }
        if (path === "proof/google/start") {
            const result = await requestServerAuth<GoogleAccountIntent>("/users/me/deletion-reauthentication/google/start", {}, session.accessToken);
            const locale = locales.some(item => item === body.locale) ? String(body.locale) : "ko";
            const response = authJson({ started: true });
            clearGoogleFlow(response);
            clearAuthCookie(response, DELETION_REAUTH_COOKIE);
            await writeAuthCookie(response, GOOGLE_FLOW_COOKIE, {
                ...result.body, purpose: "DELETE_ACCOUNT", publicId: session.user.publicId!, loginSessionId: session.loginSessionId!, locale,
                validUntil: Date.now() + Math.min(result.body.expiresIn, 300) * 1000,
            }, 900);
            return response;
        }
        if (path === "request") {
            let receipt;
            try { receipt = parseDeletionReceipt(body); }
            catch { throw new AuthRequestError("INVALID_REQUEST", 400); }
            if (receipt.expectedPublicId !== session.user.publicId) throw new AuthRequestError("ACCOUNT_DELETION_ACCOUNT_MISMATCH", 409);
            if (body.confirmation !== "DELETE_ACCOUNT" || !ready) throw new AuthRequestError("REAUTHENTICATION_REQUIRED", 403);
            const result = await requestServerAuth("/users/me/deletion-requests", {
                operationId: receipt.operationId, receiptSecret: receipt.receiptSecret, expectedPublicId: receipt.expectedPublicId,
                confirmation: "DELETE_ACCOUNT", reauthenticationToken: proof.reauthToken,
            }, session.accessToken);
            const response = authJson(parseDeletionStatus(result.body, receipt.operationId));
            clearAuthCookie(response, DELETION_REAUTH_COOKIE);
            clearGoogleFlow(response);
            return response;
        }
        throw new AuthRequestError("INVALID_REQUEST", 404);
    } catch (error) {
        return authRouteError(error);
    }
}
