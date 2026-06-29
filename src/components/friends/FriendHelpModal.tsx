"use client";

import type React from "react";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import {
    MessageCircle,
    Search,
    Shield,
    UserPlus,
    UsersRound,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";

type FriendHelpModalVariant = "friendList" | "friendSearch";

type FriendHelpModalProps = {
    isOpen: boolean;
    variant: FriendHelpModalVariant;
    onClose: () => void;
};

export default function FriendHelpModal({
    isOpen,
    variant,
    onClose,
}: FriendHelpModalProps) {
    const t = useTranslations("Social.friendListPage.help");

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const items =
        variant === "friendSearch"
            ? [
                  {
                      icon: <Search className="h-5 w-5" aria-hidden="true" />,
                      title: t("search.items.publicId.title"),
                      description: t("search.items.publicId.description"),
                  },
                  {
                      icon: (
                          <UserPlus
                              className="h-5 w-5"
                              aria-hidden="true"
                          />
                      ),
                      title: t("search.items.request.title"),
                      description: t("search.items.request.description"),
                  },
                  {
                      icon: (
                          <MessageCircle
                              className="h-5 w-5"
                              aria-hidden="true"
                          />
                      ),
                      title: t("search.items.friend.title"),
                      description: t("search.items.friend.description"),
                  },
              ]
            : [
                  {
                      icon: (
                          <UserPlus
                              className="h-5 w-5"
                              aria-hidden="true"
                          />
                      ),
                      title: t("list.items.find.title"),
                      description: t("list.items.find.description"),
                  },
                  {
                      icon: (
                          <MessageCircle
                              className="h-5 w-5"
                              aria-hidden="true"
                          />
                      ),
                      title: t("list.items.direct.title"),
                      description: t("list.items.direct.description"),
                  },
                  {
                      icon: (
                          <UsersRound
                              className="h-5 w-5"
                              aria-hidden="true"
                          />
                      ),
                      title: t("list.items.group.title"),
                      description: t("list.items.group.description"),
                  },
                  {
                      icon: (
                          <Shield
                              className="h-5 w-5"
                              aria-hidden="true"
                          />
                      ),
                      title: t("list.items.manage.title"),
                      description: t("list.items.manage.description"),
                  },
              ];

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-black/60"
            role="presentation"
            onClick={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                            {t("eyebrow")}
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                            {variant === "friendSearch"
                                ? t("search.title")
                                : t("list.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {variant === "friendSearch"
                                ? t("search.description")
                                : t("list.description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("close")}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="space-y-3 border-t border-slate-200 p-5 dark:border-white/10">
                    {variant === "friendSearch" && (
                        <p className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold leading-6 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200">
                            {t("search.initialHint")}
                        </p>
                    )}

                    {items.map((item) => (
                        <HelpItem
                            key={item.title}
                            icon={item.icon}
                            title={item.title}
                            description={item.description}
                        />
                    ))}
                </div>
            </section>
        </div>,
        document.body,
    );
}

type HelpItemProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
};

function HelpItem({ icon, title, description }: HelpItemProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
