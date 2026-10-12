"use client";

import { useEffect, useRef, useState } from "react";

import { supportErrorKey } from "@/features/support/supportModel";
import { supportService } from "@/services/support/supportService";
import type { SupportDraft, SupportUser } from "@/types/support";

export function useSupportComposer(initial: SupportDraft) {
    const [draft, setDraft] = useState(initial);
    const [recipientQuery, setRecipientQuery] = useState("");
    const [recipients, setRecipients] = useState<SupportUser[]>([]);
    const [isSearching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const request = useRef<AbortController | null>(null);

    useEffect(() => () => request.current?.abort(), []);

    const updateDraft = <K extends keyof SupportDraft>(key: K, value: SupportDraft[K]) => {
        setDraft((current) => ({ ...current, [key]: value }));
    };

    const updateRecipientQuery = (value: string) => {
        // 검색어가 바뀌면 이전 선택과 늦은 검색 결과를 폐기한다.
        request.current?.abort();
        setRecipientQuery(value);
        setRecipients([]);
        setHasSearched(false);
        setSearching(false);
        setSearchError(null);
        updateDraft("recipient", null);
    };

    const searchRecipients = async () => {
        if (recipientQuery.trim().length < 2 || isSearching) {
            return;
        }

        request.current?.abort();
        const currentRequest = new AbortController();
        request.current = currentRequest;
        setSearching(true);
        setSearchError(null);
        setHasSearched(true);

        try {
            const results = await supportService.searchRecipients(recipientQuery, currentRequest.signal);

            if (!currentRequest.signal.aborted) {
                setRecipients(results);
            }
        } catch (error) {
            if (!currentRequest.signal.aborted) {
                setSearchError(supportErrorKey(error));
                setRecipients([]);
            }
        } finally {
            if (!currentRequest.signal.aborted) {
                setSearching(false);
            }
        }
    };

    return {
        draft, updateDraft, recipientQuery, updateRecipientQuery,
        recipients, isSearching, hasSearched, searchError, searchRecipients,
    };
}

export type SupportComposerController = ReturnType<typeof useSupportComposer>;
