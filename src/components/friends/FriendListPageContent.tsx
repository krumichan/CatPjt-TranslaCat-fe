"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import FriendHelpModal from "@/components/friends/FriendHelpModal";
import FriendList from "@/components/friends/FriendList";
import FriendListEmptyState from "@/components/friends/FriendListEmptyState";
import FriendListStatePanel from "@/components/friends/FriendListStatePanel";
import FriendListToolbar from "@/components/friends/FriendListToolbar";
import FriendSearchModal from "@/components/friends/FriendSearchModal";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { useFriendList } from "@/hooks/friends/useFriendList";

export default function FriendListPageContent() {
    const t = useTranslations("Social.friendListPage");
    const friendList = useFriendList();

    const [isFriendSearchModalOpen, setIsFriendSearchModalOpen] =
        useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const hasFriends = friendList.friends.length > 0;
    const hasFilteredFriends = friendList.filteredFriends.length > 0;

    const openFriendSearchModal = () => {
        setIsFriendSearchModalOpen(true);
    };

    const closeFriendSearchModal = () => {
        setIsFriendSearchModalOpen(false);
    };

    return (
        <main className="mx-auto pt-24 max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
                <FriendListToolbar
                    totalCount={friendList.friends.length}
                    filteredCount={friendList.filteredFriends.length}
                    selectedCount={friendList.selectedFriendUserIds.length}
                    searchKeyword={friendList.searchKeyword}
                    isGroupSelectionMode={
                        friendList.isGroupSelectionMode
                    }
                    onSearchChange={friendList.updateSearchKeyword}
                    onClearSearch={friendList.clearSearchKeyword}
                    onOpenFriendSearch={openFriendSearchModal}
                    onOpenHelp={() => setIsHelpModalOpen(true)}
                    onToggleGroupSelectionMode={
                        friendList.toggleGroupSelectionMode
                    }
                    onClearSelection={friendList.clearFriendSelection}
                    onGoToGroupChatCreate={
                        friendList.goToGroupChatCreate
                    }
                />

                <div className="mt-5">
                    {friendList.isLoading ? (
                        <FriendListStatePanel
                            variant="loading"
                            title={t("state.loadingTitle")}
                            description={t("state.loadingDescription")}
                        />
                    ) : friendList.actionErrorCode === "LOAD_FAILED" ? (
                        <FriendListStatePanel
                            variant="error"
                            title={t("state.loadFailedTitle")}
                            description={t(
                                "state.loadFailedDescription",
                            )}
                            actionLabel={t("actions.reload")}
                            onAction={friendList.reload}
                        />
                    ) : !hasFriends ? (
                        <FriendListEmptyState
                            onOpenFriendSearch={openFriendSearchModal}
                        />
                    ) : !hasFilteredFriends ? (
                        <FriendListStatePanel
                            variant="empty"
                            title={t("state.filteredEmptyTitle")}
                            description={t(
                                "state.filteredEmptyDescription",
                            )}
                            actionLabel={t("actions.clearSearch")}
                            onAction={friendList.clearSearchKeyword}
                        />
                    ) : (
                        <FriendList
                            friends={friendList.filteredFriends}
                            selectedFriendUserIds={
                                friendList.selectedFriendUserIds
                            }
                            isGroupSelectionMode={
                                friendList.isGroupSelectionMode
                            }
                            startingChatFriendUserId={
                                friendList.startingChatFriendUserId
                            }
                            isStartingChat={friendList.isStartingChat}
                            onStartDirectChat={
                                friendList.startDirectChat
                            }
                            onToggleFriendSelection={
                                friendList.toggleFriendSelection
                            }
                        />
                    )}

                    {friendList.actionErrorCode ===
                        "START_CHAT_FAILED" && (
                        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                            {t("messages.startChatFailed")}
                        </p>
                    )}

                    {friendList.actionErrorCode ===
                        "GROUP_ENTRY_FAILED" && (
                        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                            {t("messages.groupEntryFailed")}
                        </p>
                    )}
                </div>
            </section>

            <FriendSearchModal
                isOpen={isFriendSearchModalOpen}
                onClose={closeFriendSearchModal}
            />

            <FriendHelpModal
                isOpen={isHelpModalOpen}
                variant="friendList"
                onClose={() => setIsHelpModalOpen(false)}
            />
        </main>
    );
}
