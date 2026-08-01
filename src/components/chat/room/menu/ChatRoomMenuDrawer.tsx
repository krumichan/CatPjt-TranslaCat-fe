"use client";

import {
    AlertCircle,
    CalendarDays,
    Hash,
    Info,
    Loader2,
    Pencil,
    RefreshCw,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import {
    useEffect,
    useRef,
} from "react";
import { createPortal } from "react-dom";
import {
    useLocale,
    useTranslations,
} from "next-intl";

import { ChatRoomAvatar } from "@/components/chat/common/ChatRoomAvatar";
import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import type {
    ChatRoom,
    ChatRoomMember,
    OpenChatMemberProfile,
} from "@/types/chat";
import type {
    ChatRoomInvitationSuccessCode,
} from "@/hooks/chat/useChatRoomInvitation";

interface ChatRoomMenuDrawerProps {
    isOpen: boolean;
    room: ChatRoom;
    members: ChatRoomMember[];
    openMembers: OpenChatMemberProfile[];
    isLoading: boolean;
    loadErrorCode: string | null;
    canInvite: boolean;
    successCode:
        | ChatRoomInvitationSuccessCode
        | null;
    onClose: () => void;
    onRetry: () => Promise<void>;
    onOpenMemberProfile: (
        userId: number,
    ) => void;
    onOpenOpenMemberProfile: (
        openChatMemberId: number,
    ) => void;
    canEditMyOpenProfile: boolean;
    onOpenMyOpenProfile: () => void;
    onOpenInvitation: () => void;
    onDismissSuccess: () => void;
}

export function ChatRoomMenuDrawer({
    isOpen,
    room,
    members,
    openMembers,
    isLoading,
    loadErrorCode,
    canInvite,
    successCode,
    onClose,
    onRetry,
    onOpenMemberProfile,
    onOpenOpenMemberProfile,
    canEditMyOpenProfile,
    onOpenMyOpenProfile,
    onOpenInvitation,
    onDismissSuccess,
}: ChatRoomMenuDrawerProps) {
    const t = useTranslations("ChatRoom");
    const locale = useLocale();
    const closeButtonRef =
        useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow =
                previousOverflow;
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isOpen, onClose]);

    if (
        !isOpen ||
        typeof document === "undefined"
    ) {
        return null;
    }

    const formatJoinedAt = (value: string) =>
        new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(new Date(value));

    return createPortal(
        <div
            className="fixed inset-0 z-1100 flex justify-end bg-slate-950/60 backdrop-blur-sm"
            onMouseDown={onClose}
            data-testid="chat-room-menu-overlay"
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="chat-room-menu-title"
                className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-white shadow-2xl dark:bg-slate-950"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
                data-testid="chat-room-menu-drawer"
            >
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
                            {t("menu.eyebrow")}
                        </p>
                        <h2
                            id="chat-room-menu-title"
                            className="mt-1 text-xl font-black text-slate-900 dark:text-white"
                        >
                            {t("menu.title")}
                        </h2>
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label={t("menu.close")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    {successCode && (
                        <div
                            role="status"
                            className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                        >
                            <span>
                                {t(
                                    `invitation.success.${successCode}`,
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={onDismissSuccess}
                                aria-label={t(
                                    "invitation.success.dismiss",
                                )}
                                className="shrink-0 rounded-lg p-1 transition hover:bg-emerald-100 dark:hover:bg-emerald-400/10"
                            >
                                <X
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    )}

                    <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                            <Info
                                className="h-4 w-4 text-orange-500"
                                aria-hidden="true"
                            />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                {t("menu.roomInfo")}
                            </h3>
                        </div>

                        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                            <dt className="font-bold text-slate-400">
                                {t("menu.fields.name")}
                            </dt>
                            <dd className="min-w-0 truncate text-right font-bold text-slate-700 dark:text-slate-200">
                                {room.name ||
                                    t(
                                        "header.untitledRoom",
                                        {
                                            id: room.id,
                                        },
                                    )}
                            </dd>

                            <dt className="font-bold text-slate-400">
                                {t("menu.fields.memberCount")}
                            </dt>
                            <dd className="text-right font-bold text-slate-700 dark:text-slate-200">
                                {t("header.members", {
                                    count:
                                        room.memberCount,
                                })}
                            </dd>

                            <dt className="font-bold text-slate-400">
                                {t("menu.fields.myRole")}
                            </dt>
                            <dd className="text-right font-bold text-slate-700 dark:text-slate-200">
                                {room.myRole
                                    ? t(
                                          `members.roles.${room.myRole}`,
                                      )
                                    : "-"}
                            </dd>
                        </dl>

                        {room.roomType === "OPEN" && (
                            <button
                                type="button"
                                data-testid="open-chat-edit-my-profile-button"
                                disabled={!canEditMyOpenProfile}
                                onClick={onOpenMyOpenProfile}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                            >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                {t("openProfile.menu.editMyProfile")}
                            </button>
                        )}
                    </section>

                    <section className="mt-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Users
                                    className="h-4 w-4 text-orange-500"
                                    aria-hidden="true"
                                />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                    {t("members.title")}
                                </h3>
                            </div>

                            {canInvite && (
                                <button
                                    type="button"
                                    data-testid="chat-room-invite-button"
                                    onClick={onOpenInvitation}
                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                                >
                                    <UserPlus
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {t(
                                        "invitation.open",
                                    )}
                                </button>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="mt-4 flex items-center justify-center rounded-3xl border border-slate-200 py-10 text-sm font-bold text-slate-400 dark:border-white/10">
                                <Loader2
                                    className="mr-2 h-5 w-5 animate-spin"
                                    aria-hidden="true"
                                />
                                {t(
                                    "members.loading",
                                )}
                            </div>
                        ) : loadErrorCode ? (
                            <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-400/30 dark:bg-rose-500/10">
                                <AlertCircle
                                    className="mx-auto h-7 w-7 text-rose-500"
                                    aria-hidden="true"
                                />
                                <p className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-200">
                                    {t(
                                        "members.loadFailed",
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void onRetry()
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-600"
                                >
                                    <RefreshCw
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {t(
                                        "members.retry",
                                    )}
                                </button>
                            </div>
                        ) : (room.roomType === "OPEN"
                            ? openMembers.length === 0
                            : members.length === 0) ? (
                            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 py-10 text-center text-sm font-bold text-slate-400 dark:border-white/15">
                                {t("members.empty")}
                            </div>
                        ) : (
                            <ul className="mt-4 space-y-2">
                                {room.roomType === "OPEN"
                                    ? openMembers.map((member) => (
                                          <li key={member.openChatMemberId}>
                                              <button
                                                  type="button"
                                                  data-testid={`open-chat-room-member-${member.openChatMemberId}`}
                                                  onClick={() =>
                                                      onOpenOpenMemberProfile(
                                                          member.openChatMemberId,
                                                      )
                                                  }
                                                  aria-label={t(
                                                      "members.openProfile",
                                                      { nickname: member.nickname },
                                                  )}
                                                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-white/10 dark:bg-white/5 dark:hover:border-orange-400/40"
                                              >
                                                  <OpenChatAvatar
                                                      profileImageUrl={
                                                          member.profileImageUrl
                                                      }
                                                      alt={member.nickname}
                                                      size="sm"
                                                  />
                                                  <div className="min-w-0 flex-1">
                                                      <div className="flex items-center gap-2">
                                                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                                              {member.nickname}
                                                          </p>
                                                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                                              {t(
                                                                  `members.roles.${member.role}`,
                                                              )}
                                                          </span>
                                                      </div>
                                                      <p className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-black tracking-wider text-orange-500">
                                                          <Hash
                                                              className="h-3 w-3"
                                                              aria-hidden="true"
                                                          />
                                                          {member.memberCode}
                                                      </p>
                                                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                                          <CalendarDays
                                                              className="h-3 w-3"
                                                              aria-hidden="true"
                                                          />
                                                          {t(
                                                              "members.joinedAt",
                                                              {
                                                                  date: formatJoinedAt(
                                                                      member.joinedAt,
                                                                  ),
                                                              },
                                                          )}
                                                      </p>
                                                  </div>
                                              </button>
                                          </li>
                                      ))
                                    : members.map((member) => (
                                          <li key={member.id}>
                                              <button
                                                  type="button"
                                                  data-testid={`chat-room-member-${member.userId}`}
                                                  onClick={() =>
                                                      onOpenMemberProfile(
                                                          member.userId,
                                                      )
                                                  }
                                                  aria-label={t(
                                                      "members.openProfile",
                                                      {
                                                          nickname:
                                                              member.displayName,
                                                      },
                                                  )}
                                                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-white/10 dark:bg-white/5 dark:hover:border-orange-400/40"
                                              >
                                                  <ChatRoomAvatar
                                                      profileImageUrl={
                                                          member.profileImageUrl
                                                      }
                                                      alt={member.displayName}
                                                  />
                                                  <div className="min-w-0 flex-1">
                                                      <div className="flex items-center gap-2">
                                                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                                              {member.displayName}
                                                          </p>
                                                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                                              {t(
                                                                  `members.roles.${member.role}`,
                                                              )}
                                                          </span>
                                                      </div>
                                                      <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                          {member.publicId || "-"}
                                                      </p>
                                                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                                          <CalendarDays
                                                              className="h-3 w-3"
                                                              aria-hidden="true"
                                                          />
                                                          {t(
                                                              "members.joinedAt",
                                                              {
                                                                  date: formatJoinedAt(
                                                                      member.joinedAt,
                                                                  ),
                                                              },
                                                          )}
                                                      </p>
                                                  </div>
                                              </button>
                                          </li>
                                      ))}
                            </ul>
                        )}
                    </section>
                </div>
            </aside>
        </div>,
        document.body,
    );
}
