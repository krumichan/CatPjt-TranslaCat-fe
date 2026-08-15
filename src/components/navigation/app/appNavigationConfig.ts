import {
    BookOpen,
    GraduationCap,
    Home,
    MessageCircle,
    Mic,
    WalletCards,
} from "lucide-react";

import type {
    AppNavigationItem,
    AppNavigationSection,
} from "@/components/navigation/app/appNavigationTypes";
import { ROUTES } from "@/constants/routes";

export const APP_NAVIGATION_SECTIONS: AppNavigationSection[] = [
    {
        key: "main",
        labelKey: "main",
        items: [
            {
                key: "home",
                href: ROUTES.HOME,
                labelKey: "home",
                icon: Home,
                matchPaths: [ROUTES.HOME],
            },
        ],
    },
    {
        key: "services",
        labelKey: "services",
        items: [
            {
                key: "platform",
                href: ROUTES.NOVEL_SELECT,
                labelKey: "platform",
                icon: BookOpen,
                matchPaths: [ROUTES.NOVEL_SELECT],
            },
            {
                key: "voice",
                href: ROUTES.VOICE_SELECT,
                labelKey: "voice",
                icon: Mic,
                matchPaths: [ROUTES.VOICE_SELECT],
            },
            {
                key: "accountBook",
                href: ROUTES.ACCOUNT_BOOKS,
                labelKey: "accountBook",
                icon: WalletCards,
                matchPaths: [ROUTES.ACCOUNT_BOOKS],
            },
            {
                key: "chat",
                href: "/chat",
                labelKey: "chat",
                icon: MessageCircle,
                matchPaths: ["/chat", "/friends"],
            },
            {
                key: "languageLearning",
                href: "/language-learning",
                labelKey: "languageLearning",
                icon: GraduationCap,
                matchPaths: ["/language-learning"],
            },
        ],
    },
];

export function isNavigationItemActive(
    pathname: string,
    item: AppNavigationItem,
) {
    return item.matchPaths.some((matchPath) => {
        if (matchPath === ROUTES.HOME) {
            return pathname === ROUTES.HOME;
        }

        return (
            pathname === matchPath ||
            pathname.startsWith(`${matchPath}/`)
        );
    });
}
