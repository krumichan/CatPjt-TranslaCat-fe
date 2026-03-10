import { useEffect } from 'react';
import { setScrollLock } from '@/utils/scroll';

export const useScrollLock = (shouldLock: boolean) => {
    useEffect(() => {
        setScrollLock(shouldLock);

        // 컴포넌트가 사라질 때(Unmount) 자동으로 잠금 해제
        return () => setScrollLock(false);
    }, [shouldLock]);
};