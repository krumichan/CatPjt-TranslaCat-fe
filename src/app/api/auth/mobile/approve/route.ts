import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
    authorizeMobileApproval, canApproveMobile, MobileApprovalError, readMobileApprovalRequest,
    requireMobileApprovalOrigin, verifyMobileApprovalCsrf,
} from "@/lib/mobileAuthApproval";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privacyHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
    try {
        // 현재 웹 세션과 화면에서 발급한 CSRF를 확인한 명시적 POST만 승인한다.
        requireMobileApprovalOrigin(request);
        const requestId = await readMobileApprovalRequest(request);
        const session = await getServerSession(authOptions);
        if (!canApproveMobile(session)) throw new MobileApprovalError("AUTH_REQUIRED", 401);
        verifyMobileApprovalCsrf(request, requestId, session);

        // 사용자 access는 BE에만 전달하고 브라우저에는 짧게 유효한 일회 callback만 반환한다.
        const callbackUrl = await authorizeMobileApproval(requestId, session.accessToken);
        return NextResponse.json({ body: { callbackUrl } }, { headers: privacyHeaders });
    } catch (error) {
        return NextResponse.json({ body: { errorCode: error instanceof MobileApprovalError ? error.code : "MOBILE_AUTH_UNAVAILABLE" } }, {
            status: error instanceof MobileApprovalError ? error.status : 503, headers: privacyHeaders,
        });
    }
}
