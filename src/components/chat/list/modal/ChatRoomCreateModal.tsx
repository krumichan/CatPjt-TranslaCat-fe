"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ChatRoomCreateForm } from "@/components/chat/list/modal/ChatRoomCreateForm";
import { useCreateChatRoom } from "@/hooks/chat/useCreateChatRoom";
import type { ChatRoomCreateRequest } from "@/types/chat";

interface ChatRoomCreateModalProps {
    open: boolean;
    onClose: () => void;
    onCreated?: () => Promise<void> | void;
}

export function ChatRoomCreateModal({
    open,
    onClose,
    onCreated,
}: ChatRoomCreateModalProps) {
    const t = useTranslations("ChatRoomCreate");
    const router = useRouter();

    const {
        isCreating,
        createErrorCode,
        createRoom,
        clearCreateError,
    } = useCreateChatRoom();

    if (!open) {
        return null;
    }

    const handleClose = () => {
        clearCreateError();
        onClose();
    };

    const handleCreate = async (request: ChatRoomCreateRequest) => {
        const createdRoom = await createRoom(request);

        if (!createdRoom) {
            return false;
        }

        await onCreated?.();
        handleClose();
        router.push(`/chat/rooms/${createdRoom.id}`);

        return true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {t("title")}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label={t("close")}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <ChatRoomCreateForm
                    isCreating={isCreating}
                    createErrorMessage={
                        createErrorCode ? t("error.createFailed") : null
                    }
                    onClose={handleClose}
                    onCreate={handleCreate}
                />
            </div>
        </div>
    );
}