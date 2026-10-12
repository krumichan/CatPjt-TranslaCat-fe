"use client";

import { useCallback, useRef, useState } from "react";
import type { SupportReply } from "@/types/support";

export function useSupportReplyComposer() {
    const [content, setContent] = useState("");
    const [parent, setParent] = useState<SupportReply | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const setInputElement = useCallback((element: HTMLTextAreaElement | null) => {
        inputRef.current = element;
    }, []);

    const selectParent = (reply: SupportReply) => {
        setParent(reply);
        inputRef.current?.focus();
    };

    const reset = () => {
        setContent("");
        setParent(null);
    };

    return { content, setContent, parent, setParent, setInputElement, selectParent, reset };
}
