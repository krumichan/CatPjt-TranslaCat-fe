import type { LucideIcon } from "lucide-react";

export type AppNavigationBadge = "new" | "comingSoon";

export interface AppNavigationItem {
    key:
        | "home"
        | "platform"
        | "voice"
        | "accountBook"
        | "chat"
        | "languageLearning"
        | "support";
    href: string;
    labelKey:
        | "home"
        | "platform"
        | "voice"
        | "accountBook"
        | "chat"
        | "languageLearning"
        | "support";
    icon: LucideIcon;
    matchPaths: string[];
    adminOnly?: boolean;
    badge?: AppNavigationBadge;
    disabled?: boolean;
}

export interface AppNavigationSection {
    key: "main" | "services";
    labelKey: "main" | "services";
    items: AppNavigationItem[];
}
