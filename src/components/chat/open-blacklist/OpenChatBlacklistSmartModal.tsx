"use client";

import { useLocale } from "next-intl";
import { useCallback, useRef, type FormEvent } from "react";

import { OpenChatBanReleaseDialog } from "@/components/chat/open-blacklist/OpenChatBanReleaseDialog";
import { OpenChatBlacklistModal } from "@/components/chat/open-blacklist/OpenChatBlacklistModal";
import { useOpenChatBlacklist } from "@/hooks/chat/useOpenChatBlacklist";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

interface OpenChatBlacklistSmartModalProps {
    isOpen: boolean;
    roomId: number;
    roomName: string;
    onClose: () => void;
}

export function OpenChatBlacklistSmartModal({
    isOpen,
    roomId,
    roomName,
    onClose,
}: OpenChatBlacklistSmartModalProps) {
    const locale = useLocale();
    const blacklist = useOpenChatBlacklist(roomId, { enabled: isOpen });
    const modalRef = useRef<HTMLElement>(null);
    const releaseDialogRef = useRef<HTMLElement>(null);

    useModalFocusTrap(
        isOpen && blacklist.selectedBan === null,
        modalRef,
        onClose,
    );
    useModalFocusTrap(
        blacklist.selectedBan !== null,
        releaseDialogRef,
        blacklist.closeReleaseDialog,
    );

    const formatDate = useCallback(
        (value: string) =>
            new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(value)),
        [locale],
    );

    const submitSearch = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void blacklist.search();
        },
        [blacklist],
    );

    return (
        <>
            <OpenChatBlacklistModal
                isOpen={isOpen}
                modalRef={modalRef}
                roomName={roomName}
                items={blacklist.items}
                keywordInput={blacklist.keywordInput}
                appliedKeyword={blacklist.appliedKeyword}
                isLoading={blacklist.isLoading}
                isLoadingMore={blacklist.isLoadingMore}
                hasNext={blacklist.hasNext}
                loadErrorCode={blacklist.loadErrorCode}
                formatDate={formatDate}
                onClose={onClose}
                onKeywordChange={blacklist.setKeywordInput}
                onClearSearch={() => void blacklist.clearSearch()}
                onSubmitSearch={submitSearch}
                onRetry={() => void blacklist.reload()}
                onLoadMore={() => void blacklist.loadMore()}
                onOpenRelease={blacklist.openReleaseDialog}
            />

            <OpenChatBanReleaseDialog
                dialogRef={releaseDialogRef}
                selectedBan={blacklist.selectedBan}
                isReleasing={blacklist.isReleasing}
                errorCode={blacklist.releaseErrorCode}
                onClose={blacklist.closeReleaseDialog}
                onRelease={() => void blacklist.release()}
            />
        </>
    );
}
