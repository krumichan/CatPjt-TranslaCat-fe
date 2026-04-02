"use client";

import React, {ReactNode, useEffect, useState} from "react";
import {useAppRouter} from "@/hooks/useAppRouter";
import {friendService} from "@/services/chat/friendService";
import {ROUTES, to} from "@/constants/routes";
import SpinLoader from "@/components/common/loader/SpinLoader";

export default function ChatGuard({ children }: { children: ReactNode }) {
    const [isActivated, setIsActivated] = useState<boolean | null>(null);
    const router = useAppRouter();

    useEffect(() => {
        const check = async () => {
            try {
                const active = await friendService.checkActivation();
                if (!active) {
                    router.replace(to(ROUTES.CHAT_PROFILE_SETUP));
                    setIsActivated(false);
                } else {
                    setIsActivated(true);
                }
            } catch (error) {
                console.error("Activation check failed: ", error);
                router.replace(to(ROUTES.HOME));
            }
        };
        check();
    }, [router]);

    if (isActivated === null) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
                <SpinLoader isLoading={true} size="lg"/>
            </div>
        );
    }

    return <>{children}</>;
}