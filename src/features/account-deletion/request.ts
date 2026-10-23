import { IdentityError, identityRequest } from "@/services/identityClient";

export async function deletionRequest<T>(path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    let rejectDeadline: (() => void) | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
        rejectDeadline = () => reject(new IdentityError("AUTH_UNAVAILABLE"));
    });
    const timer = setTimeout(() => { controller.abort(); rejectDeadline?.(); }, 15000);
    try {
        // 통신이 abort를 무시해도 화면 대기는 끝낸다. 전송 결과 불명 시 영수증 조회만 허용한다.
        return await Promise.race([identityRequest<T>(path, body, controller.signal), deadline]);
    } finally { clearTimeout(timer); }
}
