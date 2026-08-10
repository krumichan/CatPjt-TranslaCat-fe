"use client";

import { useCallback, useRef, useState } from "react";

import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatRoomMemberRole,
    OpenChatMemberProfile,
    OpenChatProfileSnapshot,
} from "@/types/chat";

export function useOpenChatMemberProfilePreview(roomId: number) {
    const [selectedMemberId, setSelectedMemberId] =
        useState<number | null>(null);
    const [profile, setProfile] =
        useState<OpenChatMemberProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<"LOAD_FAILED" | null>(null);
    const requestSequenceRef = useRef(0);
    const profilePatchVersionRef = useRef(new Map<number, number>());
    const latestProfilePatchRef = useRef(
        new Map<number, OpenChatProfileSnapshot>(),
    );
    const presencePatchVersionRef = useRef(new Map<number, number>());
    const latestPresencePatchRef = useRef(new Map<number, boolean>());

    const openProfile = useCallback(
        async (openChatMemberId: number) => {
            const sequence = ++requestSequenceRef.current;
            const patchVersionAtRequest =
                profilePatchVersionRef.current.get(openChatMemberId) ?? 0;
            const presencePatchVersionAtRequest =
                presencePatchVersionRef.current.get(openChatMemberId) ?? 0;
            setSelectedMemberId(openChatMemberId);
            setProfile(null);
            setLoadErrorCode(null);
            setIsLoading(true);

            try {
                const nextProfile =
                    await openChatService.getMemberProfile(
                        roomId,
                        openChatMemberId,
                    );

                if (sequence !== requestSequenceRef.current) {
                    return false;
                }

                const latestPatchVersion =
                    profilePatchVersionRef.current.get(
                        openChatMemberId,
                    ) ?? 0;
                const latestPatch =
                    latestProfilePatchRef.current.get(
                        openChatMemberId,
                    );

                const latestPresencePatchVersion =
                    presencePatchVersionRef.current.get(openChatMemberId) ?? 0;
                const latestOnline =
                    latestPresencePatchRef.current.get(openChatMemberId);
                const profileWithRealtimePatch =
                    latestPatch &&
                    latestPatchVersion > patchVersionAtRequest
                        ? { ...nextProfile, ...latestPatch }
                        : nextProfile;

                setProfile(
                    latestPresencePatchVersion >
                            presencePatchVersionAtRequest &&
                        latestOnline !== undefined
                        ? {
                              ...profileWithRealtimePatch,
                              online: latestOnline,
                          }
                        : profileWithRealtimePatch,
                );
                return true;
            } catch (error) {
                console.error(
                    "Failed to load OPEN chat member profile.",
                    error,
                );
                if (sequence === requestSequenceRef.current) {
                    setLoadErrorCode("LOAD_FAILED");
                }
                return false;
            } finally {
                if (sequence === requestSequenceRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [roomId],
    );

    const retryProfile = useCallback(async () => {
        if (selectedMemberId === null) {
            return false;
        }
        return openProfile(selectedMemberId);
    }, [openProfile, selectedMemberId]);

    const closeProfile = useCallback(() => {
        requestSequenceRef.current += 1;
        setSelectedMemberId(null);
        setProfile(null);
        setIsLoading(false);
        setLoadErrorCode(null);
    }, []);

    const applyProfile = useCallback(
        (nextProfile: OpenChatMemberProfile | OpenChatProfileSnapshot) => {
            const snapshot: OpenChatProfileSnapshot = {
                openChatMemberId: nextProfile.openChatMemberId,
                memberCode: nextProfile.memberCode,
                nickname: nextProfile.nickname,
                profileImageUrl: nextProfile.profileImageUrl,
                role: nextProfile.role,
            };
            const previousVersion =
                profilePatchVersionRef.current.get(
                    nextProfile.openChatMemberId,
                ) ?? 0;

            profilePatchVersionRef.current.set(
                nextProfile.openChatMemberId,
                previousVersion + 1,
            );
            latestProfilePatchRef.current.set(
                nextProfile.openChatMemberId,
                snapshot,
            );

            setProfile((current) =>
                current?.openChatMemberId ===
                nextProfile.openChatMemberId
                    ? { ...current, ...snapshot }
                    : current,
            );
        },
        [],
    );

    const applyPresence = useCallback(
        (openChatMemberId: number, online: boolean) => {
            const previousVersion =
                presencePatchVersionRef.current.get(openChatMemberId) ?? 0;
            presencePatchVersionRef.current.set(
                openChatMemberId,
                previousVersion + 1,
            );
            latestPresencePatchRef.current.set(openChatMemberId, online);

            setProfile((current) =>
                current?.openChatMemberId === openChatMemberId
                    ? { ...current, online }
                    : current,
            );
        },
        [],
    );

    const applyRole = useCallback(
        (openChatMemberId: number, role: ChatRoomMemberRole) => {
            setProfile((current) =>
                current?.openChatMemberId === openChatMemberId
                    ? { ...current, role }
                    : current,
            );
        },
        [],
    );

    const removeMember = useCallback(
        (openChatMemberId: number) => {
            if (selectedMemberId === openChatMemberId) {
                closeProfile();
            }
        },
        [closeProfile, selectedMemberId],
    );

    return {
        selectedMemberId,
        profile,
        isOpen: selectedMemberId !== null,
        isLoading,
        loadErrorCode,
        openProfile,
        retryProfile,
        closeProfile,
        applyProfile,
        applyRole,
        applyPresence,
        removeMember,
    };
}
