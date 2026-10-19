import type { Metadata } from "next";
import { getServerSession } from "next-auth";

import MobileSignIn from "@/components/auth/MobileSignIn";
import { authOptions } from "@/lib/auth";
import { canApproveMobile, createMobileApprovalCsrf, requireMobileApprovalConfiguration } from "@/lib/mobileAuthApproval";
import { mobileSignInPath, validMobileRequestId } from "@/lib/mobileAuthPolicy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
    title: "TranslaCat · App sign-in", referrer: "no-referrer", robots: { index: false, follow: false },
};

export default async function MobileSignInPage({ params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { locale } = await params;
    const query = await searchParams;
    const requestId = Object.keys(query).length === 1 && validMobileRequestId(query.requestId) ? query.requestId : null;
    let csrfToken: string | null = null;
    let account: { name: string | null; email: string | null; publicId: string } | null = null;
    let unavailable = false;
    if (requestId) {
        try {
            requireMobileApprovalConfiguration();
            // 웹 계정의 access/refresh는 Client Component props나 HTML에 포함하지 않는다.
            const session = await getServerSession(authOptions);
            if (canApproveMobile(session)) {
                csrfToken = createMobileApprovalCsrf(requestId, session);
                account = { name: session.user.name ?? null, email: session.user.email ?? null, publicId: session.user.publicId };
            } else if (session) {
                unavailable = true;
            }
        } catch {
            unavailable = true;
        }
    }
    return <MobileSignIn locale={locale} requestId={requestId}
        callbackPath={requestId ? mobileSignInPath(locale, requestId) : null}
        csrfToken={csrfToken} account={account} unavailable={unavailable} />;
}
