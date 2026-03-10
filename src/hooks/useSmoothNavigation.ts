import {useCallback, useRef} from "react";
import {scrollToElement, scrollToTop} from "@/utils/scroll";

export const useSmoothNavigation = () => {
    const isFirstRender = useRef(true);

    const navigateWithScroll = useCallback(async (elementId: string, offset = 65, delay = 100) => {
        // 1. 스크롤 실행
        if (isFirstRender.current) {
            scrollToTop();
            isFirstRender.current = false;
        } else {
            scrollToElement(elementId, offset);
        }

        // 2. 브라우저가 스크롤 애니메이션에 집중할 수 있도록 약속된 시간만큼 대기
        await new Promise((resolve) => setTimeout(resolve, delay));

        return true;
    }, []);

    return { navigateWithScroll, isFirstRender };
};