export const NAVIGATION_STARTED_EVENT = "translacat:navigation-started";

export function notifyNavigationStarted(): void {
    if (typeof window === "undefined") return;

    // 언어 전환처럼 anchor가 없는 이동도 라우터 응답보다 먼저 의사를 전달한다.
    window.dispatchEvent(new Event(NAVIGATION_STARTED_EVENT));
}
