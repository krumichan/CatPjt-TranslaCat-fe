import React, {useEffect, useRef, useState} from "react";

interface MenuOptions {
    hasBottomBar?: boolean; // 하단 바 제어 여부
    autoHide?: boolean;     // 특정 상황에서 자동 숨김 처리 여부 등 (확장용)
}

export function useMenuControl(options: MenuOptions = { hasBottomBar: false }) {
    const [isMenuVisible, setIsMenuVisible] = useState(true);
    const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
    const touchStartPos = useRef({ x: 0, y: 0 });
    const lastScrollY = useRef(0);
    const isTouchAction = useRef(false);

    useEffect(() => {
        document.body.setAttribute('data-menu-visible', isMenuVisible.toString());

        // 하단 바가 있는 페이지일 때만 포탈 요소를 찾습니다.
        if (options.hasBottomBar) {
            const el = document.getElementById("bottom-ui-portal");
            if (el && portalElement !== el) {
                requestAnimationFrame(() => {
                    setPortalElement(el);
                });
            }
        }

        const handleScroll = (e: Event) => {
            // [수정] 스크롤 주체가 누구든 상관없이 현재 스크롤 위치를 정확히 가져옵니다.
            const target = e.target as HTMLElement;
            const currentScrollY = target.scrollTop !== undefined
                ? target.scrollTop
                : (window.scrollY || document.documentElement.scrollTop);

            // 스크롤을 아래로 10px 이상 내렸을 때 메뉴 숨김 (상단 50px 이후부터 작동)
            if (currentScrollY > lastScrollY.current + 10 && isMenuVisible && currentScrollY > 50) {
                setIsMenuVisible(false);
            }

            lastScrollY.current = currentScrollY;
        };

        const scrollOptions: AddEventListenerOptions = { passive: true, capture: true };

        window.addEventListener('scroll', handleScroll, scrollOptions);

        return () => {
            document.body.removeAttribute('data-menu-visible');
            window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
        };
    }, [isMenuVisible, options.hasBottomBar, portalElement]);

    const handleTouchStart = (e: React.TouchEvent) => {
        isTouchAction.current = true;
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dX = Math.abs(endX - touchStartPos.current.x);
        const dY = Math.abs(endY - touchStartPos.current.y);

        if (dX < 10 && dY < 10) {
            setIsMenuVisible(prev => !prev);
        }

        // 터치 동작이 끝난 후 약간의 시간을 두고 플래그를 해제 (클릭 이벤트와 겹침 방지)
        setTimeout(() => { isTouchAction.current = false; }, 300);
    };

    const handleMouseClick = (e: React.MouseEvent) => {
        if (isTouchAction.current) return;

        const target = e.target as HTMLElement;
        // 버튼이나 링크 클릭은 무시
        if (target.closest('button') || target.closest('a')) return;

        // 본문 영역 클릭 시 토글
        if (target.tagName === 'MAIN' || target.closest('main') || target.closest('.viewer-content')) {
            setIsMenuVisible(prev => !prev);
        }
    };

    return {
        isMenuVisible,
        portalElement,
        menuHandlers: { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd, onClick: handleMouseClick },
        // [핵심] 옵션에 따라 스타일을 다르게 계산해서 내려줍니다.
        containerStyle: {
            '--header-transform': isMenuVisible ? '0' : '-100%',
            // 하단 바 제어 옵션이 true일 때만 본문 이동(-60px)을 적용합니다.
            '--content-move': (options.hasBottomBar && !isMenuVisible) ? '-60px' : '0px'
        } as React.CSSProperties,
        // 패딩 역시 옵션에 따라 다르게 적용
        mainClassName: `w-full max-w-4xl px-4 md:px-6 pb-32 transition-all duration-300 ${
            isMenuVisible
                ? (options.hasBottomBar ? 'pt-20 md:pt-24' : 'pt-20') // 헤더 공간 확보
                : (options.hasBottomBar ? 'pt-4 md:pt-8' : 'pt-4')    // 숨겼을 때
        }`
    };
}