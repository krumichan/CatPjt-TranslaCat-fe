import assert from "node:assert/strict";
import test from "node:test";
import { positionReceiptActionMenu } from "../../src/utils/account-book/receiptActionMenu.ts";

test("receipt menu chooses available space above or below and clamps to viewport", () => {
    // 준비: 스크롤 본문 안에서 위/아래 여유가 다른 행을 구성한다.
    const bounds = { left: 8, right: 1016, top: 200, bottom: 700 };
    const menu = { width: 160, height: 50 };

    // 실행 / 검증: 일반 행은 아래, 하단 행은 위, 좌측 끝은 화면 안쪽에 놓는다.
    assert.deepEqual(positionReceiptActionMenu({ left: 900, right: 932, top: 250, bottom: 282 }, menu, bounds),
        { placement: "bottom", left: 772, top: 286 });
    assert.deepEqual(positionReceiptActionMenu({ left: 900, right: 932, top: 650, bottom: 682 }, menu, bounds),
        { placement: "top", left: 772, top: 596 });
    assert.equal(positionReceiptActionMenu({ left: 10, right: 42, top: 250, bottom: 282 }, menu, bounds).left, 8);
    const narrow = { left: 8, right: 312, top: 100, bottom: 140 };
    assert.equal(positionReceiptActionMenu({ left: 300, right: 332, top: 100, bottom: 132 }, menu, narrow).left, 152);
    assert.equal(positionReceiptActionMenu({ left: 300, right: 332, top: 100, bottom: 132 }, menu, narrow).top, 100);
});
