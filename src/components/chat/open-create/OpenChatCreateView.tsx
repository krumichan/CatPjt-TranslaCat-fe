"use client";

import { OpenChatCreateHeader } from "@/components/chat/open-create/OpenChatCreateHeader";
import { OpenChatCreateSummary } from "@/components/chat/open-create/OpenChatCreateSummary";
import { OpenChatOwnerProfileSection } from "@/components/chat/open-create/OpenChatOwnerProfileSection";
import { OpenChatRoomFormSection } from "@/components/chat/open-create/OpenChatRoomFormSection";
import type { UseOpenChatCreateResult } from "@/hooks/chat/openChatCreateTypes";

interface OpenChatCreateViewProps {
    controller: UseOpenChatCreateResult;
}

export function OpenChatCreateView({
    controller,
}: OpenChatCreateViewProps) {
    const { roomForm, submission } = controller;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6">
            <div className="mx-auto w-full max-w-6xl pt-20">
                <OpenChatCreateHeader
                    createdRoomId={submission.createdRoomId}
                    isSubmitting={submission.isSubmitting}
                    onBack={submission.cancel}
                />

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
                    <OpenChatRoomFormSection controller={roomForm} />

                    <div className="space-y-6">
                        <OpenChatOwnerProfileSection
                            controller={submission}
                        />
                        <OpenChatCreateSummary
                            name={roomForm.name}
                            visibility={roomForm.visibility}
                            maxMemberCount={roomForm.maxMemberCount}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
