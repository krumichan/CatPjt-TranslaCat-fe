import assert from "node:assert/strict";
import test from "node:test";
import { leavesReaderInCurrentTab } from "../../src/features/novel/navigationIntent.ts";

const click = { button: 0, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, defaultPrevented: false,
    download: false, target: "", href: "/ko", currentHref: "https://example.test/ko/novel/episode/1" };

test("same-tab reader navigation cancels reading but auxiliary link intents preserve it", () => {
    // 준비 / 실행 / 검증: 실제 링크의 부가 의사는 provider 요청의 중단 여부와 구분한다.
    assert.equal(leavesReaderInCurrentTab(click), true);
    assert.equal(leavesReaderInCurrentTab({ ...click, href: "https://other.example/" }), true);
    for (const patch of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true },
        { defaultPrevented: true }, { download: true }, { target: "_blank" }, { target: "preview" }, { href: "#same-page" }, { href: "mailto:test@example.test" }]) {
        assert.equal(leavesReaderInCurrentTab({ ...click, ...patch }), false);
    }
});
