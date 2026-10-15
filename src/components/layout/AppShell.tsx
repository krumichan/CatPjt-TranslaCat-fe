"use client";

import {
    useCallback,
    useState,
} from "react";

import Header from "@/components/layout/Header";
import { AppMobileNavigationDrawer } from "@/components/navigation/app/AppMobileNavigationDrawer";
import { AppSidebar } from "@/components/navigation/app/AppSidebar";
import { useAppSidebarState } from "@/components/navigation/app/useAppSidebarState";
import { usePathname } from "@/navigation";
import { UrgentNoticeGate } from "@/components/support/UrgentNoticeGate";

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({
    children,
}: AppShellProps) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";
    const isChatRoomPage = /^\/chat\/rooms\/[^/]+\/?$/.test(pathname);

    const [isMobileNavigationOpen, setMobileNavigationOpen] =
        useState(false);

    const {
        isCollapsed,
        toggleCollapsed,
    } = useAppSidebarState();

    const openMobileNavigation = useCallback(() => {
        setMobileNavigationOpen(true);
    }, []);

    const closeMobileNavigation = useCallback(() => {
        setMobileNavigationOpen(false);
    }, []);

    if (isLoginPage) {
        return (
            <div className="relative flex h-screen w-full flex-col overflow-hidden">
                <div className="fixed inset-0 z-0 bg-slate-50 dark:bg-slate-950" />

                <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>

                <div
                    id="bottom-ui-portal"
                    className="pointer-events-none fixed bottom-0 left-0 right-0 z-120"
                />
            </div>
        );
    }

    return (
        <div
            className={`relative flex w-full flex-col overflow-hidden ${
                isChatRoomPage ? "h-dvh" : "h-screen"
            }`}
        >
            <div className="fixed inset-0 z-0 bg-slate-50 dark:bg-slate-950" />

            <Header
                isMobileNavigationOpen={
                    isMobileNavigationOpen
                }
                onOpenMobileNavigation={openMobileNavigation}
            />

            <AppSidebar
                isCollapsed={isCollapsed}
                onToggle={toggleCollapsed}
            />

            <AppMobileNavigationDrawer
                isOpen={isMobileNavigationOpen}
                onClose={closeMobileNavigation}
            />

            <UrgentNoticeGate />

            <main
                className={`relative z-10 min-h-0 flex-1 overflow-x-hidden transition-[margin] duration-200 motion-reduce:transition-none ${
                    isChatRoomPage ? "overflow-y-hidden" : "overflow-y-auto"
                } ${
                    isCollapsed
                        ? "lg:ml-18"
                        : "lg:ml-64"
                }`}
            >
                {/* 채팅방은 메시지 목록만 스크롤한다. transform은 내부 고정 요소의 기준을 바꾼다. */}
                <div
                    className={
                        isChatRoomPage
                            ? "h-full min-h-0 overflow-hidden"
                            : "min-h-full transition-transform duration-300 ease-in-out"
                    }
                    style={
                        isChatRoomPage
                            ? undefined
                            : {
                                  transform:
                                      "translateY(var(--content-move, 0px))",
                              }
                    }
                >
                    {children}
                </div>
            </main>

            <div
                id="bottom-ui-portal"
                className={`pointer-events-none fixed bottom-0 right-0 z-120 transition-[left] duration-200 motion-reduce:transition-none ${
                    isCollapsed
                        ? "left-0 lg:left-18"
                        : "left-0 lg:left-64"
                }`}
            />
        </div>
    );
}
