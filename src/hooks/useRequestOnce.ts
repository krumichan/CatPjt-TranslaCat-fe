import {useCallback, useRef} from "react";

/**
 * 중복 호출 방지 및 파라미터 유효성 검사를 통합 수행하는 훅
 */
export const useRequestDedupe = () => {
    const lastKeyRef = useRef<string>("");

    const canExecute = useCallback((keys: (string | number | undefined | null)[]) => {
        // 1. 유효성 검사: 모든 키 값이 존재하는지 확인 (null, undefined, "" 방지)
        // 만약 하나라도 비어있다면 실행 불가능으로 판단
        const isValid = keys.every(key => key !== undefined && key !== null && key !== "");
        if (!isValid) return false;

        // 2. 중복 검사: 이전 요청 키와 동일한지 확인
        const currentKey = JSON.stringify(keys);
        if (lastKeyRef.current === currentKey) {
            return false;
        }

        // 3. 실행 확정: 키 갱신 및 통과
        lastKeyRef.current = currentKey;
        return true;
    }, []);

    return { canExecute };
};
