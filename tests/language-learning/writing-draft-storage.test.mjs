import assert from "node:assert/strict";
import { test } from "node:test";
import {
    loadWritingDraftState,
    saveWritingDraftState,
} from "../../src/features/language-learning/writing/writingDraftStorage.ts";

test("LL 초안을 다시 읽어도 같은 숫자의 이전 Core 초안을 덮어쓰지 않는다", () => {
    // 준비
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const values = new Map();
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
        localStorage: {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
        },
    } });
    const state = {
        learningDate: "2026-09-26", writingType: "FREE", bulkEvaluationRequested: false,
    };
    try {
        // 실행
        saveWritingDraftState("synthetic-user", { ...state, dailySetId: 7, drafts: { 8: "old draft" } });
        saveWritingDraftState("synthetic-user", { ...state, dailySetId: -7, drafts: { [-8]: "new draft" } });

        // 검증
        assert.deepEqual(loadWritingDraftState("synthetic-user", -7).drafts, { [-8]: "new draft" });
        assert.deepEqual(loadWritingDraftState("synthetic-user", 7).drafts, { 8: "old draft" });
        assert.equal(values.size, 2);
    } finally {
        if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
        else delete globalThis.window;
    }
});
