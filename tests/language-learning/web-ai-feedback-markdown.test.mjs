import assert from "node:assert/strict";
import test from "node:test";

import { parseFeedbackMarkdown } from "../../src/features/language-learning/web-ai/feedbackMarkdown.ts";

test("표·문장별 인용·전체 교정문을 개별 블록으로 보존한다", () => {
    // 준비
    const markdown = "## 1번 피드백\n\n| 작성 표현 | 권장 표현 | 이유 |\n| --- | --- | --- |\n| 特定な | 特定の | 명사 연결 |\n\n> 元の解答\n\n**추천 교정문**\n\nご確認ください。";

    // 실행
    const blocks = parseFeedbackMarkdown(markdown);

    // 검증
    assert.equal(blocks[0].type, "heading");
    assert.deepEqual(blocks[1], { type: "table", headers: ["작성 표현", "권장 표현", "이유"], rows: [["特定な", "特定の", "명사 연결"]] });
    assert.deepEqual(blocks[2], { type: "quote", text: "元の解答" });
    assert.equal(blocks[4].text, "ご確認ください。");
});

test("AI HTML과 코드·링크 문자열을 실행용 구조로 변환하지 않는다", () => {
    // 준비
    const markdown = '<script>alert("x")</script>\n\n```html\n<img src=x onerror=alert(1)>\n```\n\n[링크](javascript:alert(1))';

    // 실행
    const blocks = parseFeedbackMarkdown(markdown);

    // 검증
    assert.equal(blocks[0].text, '<script>alert("x")</script>');
    assert.deepEqual(blocks[1], { type: "code", text: "<img src=x onerror=alert(1)>" });
    assert.equal(blocks[2].text, "[링크](javascript:alert(1))");
});
