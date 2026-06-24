/**
 * 실제로 스크롤이 일어나는 컨테이너를 찾습니다.
 * MainLayout의 <main className="overflow-y-auto">를 타겟팅합니다.
 */
const getScrollContainer = () => {
    if (typeof window === 'undefined') return null;
    return document.querySelector('.overflow-y-auto');
};

/**
 * 페이지 상단 또는 특정 위치로 스크롤을 이동시킵니다.
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    const container = getScrollContainer();
    if (container) {
        container.scrollTo({
            top: 0,
            behavior,
        });
    } else {
        window.scrollTo({ top: 0, behavior });
    }
};

/**
 * 특정 Element의 위치로 스크롤을 이동시키되,
 * 헤더 높이만큼의 여유 공간(offset)을 둡니다.
 */
export const scrollToElement = (elementId: string, offset: number = 100) => {
    const container = getScrollContainer();
    const element = document.getElementById(elementId);

    if (container && element) {
        // 컨테이너 내부에서의 상대적 위치 계산
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // 요소의 현재 위치 + 컨테이너의 현재 스크롤 값 - 컨테이너 시작 위치 - 오프셋
        const scrollTarget = elementRect.top + container.scrollTop - containerRect.top - offset;

        container.scrollTo({
            top: scrollTarget,
            behavior: 'smooth',
        });
    }
};

/**
 * 스크롤을 잠그거나 해제합니다.
 */
export const setScrollLock = (lock: boolean) => {
    if (typeof window === 'undefined') return;

    // 1. container를 HTMLElement로 형변환하여 호출.
    const container = getScrollContainer() as HTMLElement | null;

    if (!container) return;

    if (lock) {
        container.style.overflow = 'hidden';
    } else {
        // 기존에 overflow-y-auto였으니 'auto' 또는 원래대로 복구
        container.style.overflow = 'auto';
    }
};

/**
 * 특정 스크롤 컨테이너를 맨 아래로 이동시킵니다.
 * 채팅 메시지 리스트처럼 컴포넌트 내부 스크롤 영역에 사용합니다.
 */
export const scrollElementToBottom = (
    element: HTMLElement | null,
    behavior: ScrollBehavior = "smooth",
) => {
    if (!element) return;

    element.scrollTo({
        top: element.scrollHeight,
        behavior,
    });
};

/**
 * 현재 스크롤 위치가 하단에 가까운지 확인합니다.
 * 사용자가 과거 메시지를 보고 있을 때 자동으로 맨 아래로 끌려가는 것을 방지할 때 사용합니다.
 */
export const isElementNearBottom = (
    element: HTMLElement | null,
    threshold: number = 120,
) => {
    if (!element) return true;

    const distanceFromBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;

    return distanceFromBottom <= threshold;
};