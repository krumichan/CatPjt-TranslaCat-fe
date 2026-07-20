import type { LucideIcon } from "lucide-react";

export type AppNavigationBadge = "new" | "comingSoon";

export interface AppNavigationItem {
    key:
        | "home"
        | "platform"
        | "voice"
        | "accountBook"
        | "chat"
        | "languageLearning";
    href: string;
    labelKey:
        | "home"
        | "platform"
        | "voice"
        | "accountBook"
        | "chat"
        | "languageLearning";
    icon: LucideIcon;
    matchPaths: string[];
    badge?: AppNavigationBadge;
    disabled?: boolean;
}

export interface AppNavigationSection {
    key: "main" | "services";
    labelKey: "main" | "services";
    items: AppNavigationItem[];
}
