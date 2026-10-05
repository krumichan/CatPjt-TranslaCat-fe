import { PARAGRAPH_WRITING_POLICY } from "@/types/language-learning/paragraphWriting";

export function paragraphDraftKey(owner: string, setId: number, itemId: number, revision: string): string {
    // 계정·정책·문항 revision이 달라지면 기존 답안을 새 본문에 자동으로 붙이지 않는다.
    return ["writing-paragraph-draft", owner, PARAGRAPH_WRITING_POLICY, setId, itemId, revision]
        .map((part) => encodeURIComponent(String(part))).join(":");
}

export function readParagraphDraft(storage: Pick<Storage, "getItem">, key: string): string {
    return storage.getItem(key) ?? "";
}

export function writeParagraphDraft(storage: Pick<Storage, "setItem" | "removeItem">, key: string, value: string): void {
    if (value.length > 0) storage.setItem(key, value);
    else storage.removeItem(key);
}
