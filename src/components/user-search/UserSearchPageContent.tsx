"use client";

import { useTranslations } from "next-intl";

import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import UserSearchForm from "@/components/user-search/UserSearchForm";
import UserSearchGuideCard from "@/components/user-search/UserSearchGuideCard";
import UserSearchResultCard from "@/components/user-search/UserSearchResultCard";
import UserSearchStatePanel from "@/components/user-search/UserSearchStatePanel";
import { usePublicIdUserSearch } from "@/hooks/user-search/usePublicIdUserSearch";

export default function UserSearchPageContent() {
    const t = useTranslations("Social.userSearchPage");
    const {
        publicId,
        result,
        isSearching,
        isSendingRequest,
        isStartingChat,
        hasSearched,
        searchErrorCode,
        actionErrorCode,
        actionSuccessCode,
        updatePublicId,
        search,
        sendFriendRequest,
        startDirectChat,
        clearResult,
    } = usePublicIdUserSearch();

    return (
        <main className="mx-auto pt-24 flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
                    <UserSearchForm
                        publicId={publicId}
                        isSearching={isSearching}
                        searchErrorCode={searchErrorCode}
                        onChange={updatePublicId}
                        onSubmit={search}
                        onClear={clearResult}
                    />

                    <div className="mt-6">
                        {result ? (
                            <UserSearchResultCard
                                result={result}
                                isSendingRequest={isSendingRequest}
                                isStartingChat={isStartingChat}
                                actionErrorCode={actionErrorCode}
                                actionSuccessCode={actionSuccessCode}
                                onSendFriendRequest={sendFriendRequest}
                                onStartDirectChat={startDirectChat}
                            />
                        ) : (
                            <UserSearchStatePanel
                                isSearching={isSearching}
                                hasSearched={hasSearched}
                                searchErrorCode={searchErrorCode}
                            />
                        )}
                    </div>
                </section>

                <UserSearchGuideCard />
            </div>
        </main>
    );
}
