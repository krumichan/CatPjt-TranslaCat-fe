const MAX_POLLING_MS = 5 * 60 * 1000;

export function webAiVerificationPollDelay(attempt: number, elapsedMs: number): number | null {
    // 자동 갱신은 읽기만 수행하고, 오래 기다린 뒤에는 수동 갱신으로 돌아가 무기한 통신을 피한다.
    const delay = attempt === 0 ? 2000 : 5000;
    return elapsedMs + delay > MAX_POLLING_MS ? null : delay;
}
