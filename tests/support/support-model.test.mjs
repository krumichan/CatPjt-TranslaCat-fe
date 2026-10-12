import assert from "node:assert/strict";
import test from "node:test";

import {
    buildSupportReplyThread,
    parseSupportId,
    parseSupportStatus,
    parseSupportTab,
} from "../../src/features/support/supportModel.ts";

function reply(id, parentId = null) {
    return {
        id,
        parentId,
        content: `답글 ${id}`,
        authorRole: "USER",
        authorName: "고양이",
        createdAt: "2026-10-11T10:00:00",
    };
}

test("부모보다 늦게 등록된 추가 질문은 해당 답변 바로 아래에서 표시한다", () => {
    // 준비: 시간순 목록에는 다른 최상위 답변이 자식 답글보다 먼저 있다.
    const replies = [reply(1), reply(2), reply(3, 1), reply(4, 3)];

    // 실행
    const result = buildSupportReplyThread(replies);

    // 검증: 부모와 자식의 연결을 유지하고 입력 목록은 변경하지 않는다.
    assert.deepEqual(result.map(({ reply: item, depth }) => [item.id, depth]), [
        [1, 0], [3, 1], [4, 2], [2, 0],
    ]);
    assert.equal(result[1].parent.id, 1);
    assert.deepEqual(replies.map((item) => item.id), [1, 2, 3, 4]);
});

test("존재하지 않는 부모를 참조하는 답글도 누락하지 않는다", () => {
    // 준비
    const replies = [reply(1, 999), reply(2, 1)];

    // 실행
    const result = buildSupportReplyThread(replies);

    // 검증
    assert.deepEqual(result.map(({ reply: item }) => item.id), [1, 2]);
    assert.equal(result[0].parent, null);
    assert.equal(result[1].parent.id, 1);
});

test("잘못된 순환 또는 자기 참조가 있어도 모든 답글을 한 번만 표시한다", () => {
    // 준비
    const replies = [reply(1, 2), reply(2, 1), reply(3, 3), reply(4)];

    // 실행
    const result = buildSupportReplyThread(replies);

    // 검증
    assert.equal(result.length, 4);
    assert.equal(new Set(result.map(({ reply: item }) => item.id)).size, 4);
    assert.equal(result[0].reply.id, 4);
});

test("깊은 답글 계층도 재귀 호출 한도를 넘지 않는다", () => {
    // 준비
    const replies = Array.from({ length: 20000 }, (_, index) => reply(index + 1, index || null));

    // 실행
    const result = buildSupportReplyThread(replies);

    // 검증
    assert.equal(result.length, 20000);
    assert.equal(result.at(-1).depth, 19999);
    assert.equal(result.at(-1).parent.id, 19999);
});

test("딥링크 ID는 양의 안전한 정수만 허용한다", () => {
    // 준비
    const invalid = [null, "", "0", "-1", "1.2", "1e2", "foo", "9007199254740992"];

    // 실행 / 검증
    for (const value of invalid) {
        assert.equal(parseSupportId(value), null);
    }

    assert.equal(parseSupportId("42"), 42);
});

test("알 수 없는 메뉴와 상태는 안전한 기본 목록으로 정규화한다", () => {
    // 준비 / 실행 / 검증
    assert.equal(parseSupportTab("messages"), "messages");
    assert.equal(parseSupportTab("notices"), "notices");
    assert.equal(parseSupportTab("admin"), "inquiries");
    assert.equal(parseSupportStatus("CLOSED"), "CLOSED");
    assert.equal(parseSupportStatus("invalid"), undefined);
});
