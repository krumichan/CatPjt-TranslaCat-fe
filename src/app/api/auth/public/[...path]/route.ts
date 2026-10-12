import type { NextRequest } from "next/server";

import { authJson, authRouteError, readAuthRequest, requireSameOrigin } from "@/lib/authRouteHelpers";
import { AuthRequestError, requestServerAuth } from "@/services/authService";

const endpoints: Record<string, string> = {
    "email/challenges": "/auth/email/challenges",
    "email/verify": "/auth/email/verify",
    register: "/auth/register",
};

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    try {
        // 비회원 인증 요청만 허용하며 임의의 BE 경로를 프록시하지 않는다.
        requireSameOrigin(request);
        const endpoint = endpoints[(await context.params).path.join("/")];
        if (!endpoint) throw new AuthRequestError("INVALID_REQUEST", 404);
        const body = await readAuthRequest(request);
        const result = await requestServerAuth(endpoint, body);
        return authJson(result.body);
    } catch (error) {
        return authRouteError(error);
    }
}
