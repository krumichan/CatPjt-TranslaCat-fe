"use client";

import { useCallback, useEffect, useState } from "react";

const getCurrentPageActivity = () =>
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    document.hasFocus();

export function usePageActivity() {
    const [isPageActive, setIsPageActive] = useState(
        getCurrentPageActivity,
    );

    const refreshPageActivity = useCallback(() => {
        setIsPageActive(getCurrentPageActivity());
    }, []);

    useEffect(() => {
        document.addEventListener("visibilitychange", refreshPageActivity);
        window.addEventListener("focus", refreshPageActivity);
        window.addEventListener("blur", refreshPageActivity);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                refreshPageActivity,
            );
            window.removeEventListener("focus", refreshPageActivity);
            window.removeEventListener("blur", refreshPageActivity);
        };
    }, [refreshPageActivity]);

    return isPageActive;
}
