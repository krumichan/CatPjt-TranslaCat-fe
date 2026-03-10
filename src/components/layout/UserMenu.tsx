"use client";

import {signOut, useSession} from "next-auth/react";
import {useEffect, useRef, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "@/navigation";
import { RecentView, recentViewService } from "@/services/recentViewService";
import {getRecentViewLink} from "@/utils/routerHelper";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import {BookOpen, Home, Menu, Mic} from "lucide-react";
import {ROUTES} from "@/constants/routes";
import RecentHistorySection from "@/components/header/RecentHistorySection";
import NavLink from "@/components/navigation/NavLink";
import UserAuthSection from "@/components/header/UserAuthSection";

export default function UserMenu() {
    const {data: session, status} = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [recentViews, setRecentViews] = useState<RecentView[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const t = useTranslations('Navigation');
    const locale = useLocale();
    const router = useRouter();
    const ln = useLocalizedName();

    const [isLoadingRecent, setIsLoadingRecent] = useState(false);

    const handleLogout = async () => {
        await signOut({ callbackUrl: `/${locale}` });
    };

    useEffect(() => {
        // 1. 비동기 로직을 별도 함수로 분리
        const fetchRecentViews = async () => {
            setIsLoadingRecent(true); // 비동기 함수 시작 시점에 호출
            try {
                const data = await recentViewService.getTop10();
                setRecentViews(data.slice(0, 10));
            } catch (error) {
                console.error("Failed to fetch recent views:", error);
            } finally {
                setIsLoadingRecent(false);
            }
        };

        // 2. 조건이 맞을 때만 실행
        if (isOpen && status === "authenticated") {
            fetchRecentViews();
        }
    }, [isOpen, status]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95 group"
                aria-label="Menu"
            >
                <Menu className="w-6 h-6" />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl py-2 z-110 animate-in fade-in zoom-in duration-200"
                >
                    {/* [섹션 1] 최근 본 기록 */}
                    <RecentHistorySection
                        status={status}
                        isLoadingRecent={isLoadingRecent}
                        recentViews={recentViews}
                        ln={ln}
                        onLinkClick={(item: RecentView) => {
                            router.push(getRecentViewLink(item));
                            setIsOpen(false);
                        }}
                    />

                    {/* [섹션 2] 메인 서비스 링크 */}
                    <nav className="flex flex-col">
                        <NavLink href={ROUTES.HOME} icon={Home} label={t('home')} onClick={() => setIsOpen(false)} />
                        <NavLink href={ROUTES.NOVEL_SELECT} icon={BookOpen} label={t('platform')} onClick={() => setIsOpen(false)} />
                        <NavLink href={ROUTES.VOICE_SELECT} icon={Mic} label={t('voice')} onClick={() => setIsOpen(false)} />
                    </nav>

                    {/* [섹션 3] 사용자 인증 상태 영역 */}
                    <UserAuthSection
                        status={status}
                        userName={session?.user?.name}
                        handleLogout={handleLogout}
                        onLinkClick={() => setIsOpen(false)}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
};