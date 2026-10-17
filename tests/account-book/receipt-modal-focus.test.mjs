import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function modalFocusHarness({ explicitInitialFocus = false } = {}) {
    const source = readFileSync(new URL("../../src/hooks/account-book/detail/receipt/useReceiptReviewModal.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const timers = [];
    const listeners = new Map();
    const parentAttributes = new Map([["aria-hidden", "false"]]);
    const parent = {
        inert: false,
        getAttribute: (name) => parentAttributes.get(name) ?? null,
        setAttribute: (name, value) => parentAttributes.set(name, value),
        removeAttribute: (name) => parentAttributes.delete(name),
    };
    const document = { activeElement: null, getElementById: () => parent,
        addEventListener: (type, listener) => listeners.set(type, listener),
        removeEventListener: (type) => listeners.delete(type) };

    // DOM 선택과 focus 이동만 대체하고 실제 hook의 Tab/Escape 처리기를 실행한다.
    function element(tag, attrs = {}) {
        return { tag, attrs, isConnected: true, focus() { document.activeElement = this; } };
    }
    const help = element("a", { href: "/ko/docs/account-books/receipt-review" });
    const amount = element("input", { initialFocus: explicitInitialFocus });
    const disabled = element("button", { disabled: true });
    const cancel = element("button");
    const noHref = element("a");
    const nodes = [help, amount, disabled, cancel, noHref];
    const dialog = element("div");
    dialog.querySelector = () => nodes.find((node) => node.attrs.initialFocus) ?? null;
    dialog.querySelectorAll = (selector) => {
        const selectors = selector.split(",").map((value) => value.trim());
        return nodes.filter((node) => selectors.some((value) => {
            if (value === "a[href]") return node.tag === "a" && !!node.attrs.href;
            if (value === '[tabindex]:not([tabindex="-1"])') return node.attrs.tabindex != null && node.attrs.tabindex !== "-1";
            return value === `${node.tag}:not([disabled])` && !node.attrs.disabled;
        }));
    };
    const returnTarget = element("button");
    const effects = [];
    let closeCalls = 0;
    const exports = {};
    vm.runInNewContext(compiled, { exports, document, window: { setTimeout: (callback) => timers.push(callback) },
        require(name) {
            assert.equal(name, "react");
            return { useRef: () => ({ current: dialog }), useEffect: (callback) => effects.push(callback) };
        } });
    exports.useReceiptReviewModal({ returnFocusRef: { current: returnTarget }, onClose: () => { closeCalls++; } });
    const cleanup = effects[0]();
    const flushTimers = () => { while (timers.length) timers.shift()(); };
    flushTimers();

    return { document, parent, parentAttributes, help, amount, cancel, returnTarget, cleanup, flushTimers,
        closeCalls: () => closeCalls,
        key(key, shiftKey = false) {
            const event = { key, shiftKey, defaultPrevented: false, propagationStopped: false,
                preventDefault() { this.defaultPrevented = true; },
                stopPropagation() { this.propagationStopped = true; } };
            listeners.get("keydown")?.(event);
            return event;
        } };
}

test("receipt modal includes its guide link in forward and reverse Tab wrapping", () => {
    // 준비: 가이드 링크가 첫 요소이고 마지막 버튼 뒤에는 href 없는 앵커가 있다.
    const harness = modalFocusHarness();
    assert.equal(harness.document.activeElement, harness.help);

    // 실행: 마지막 버튼에서 Tab을 누르고 가이드 링크에서 Shift+Tab을 누른다.
    harness.cancel.focus();
    const forward = harness.key("Tab");
    assert.equal(harness.document.activeElement, harness.help);
    const reverse = harness.key("Tab", true);

    // 검증: 링크가 순환 경계에 포함되고 disabled·href 없는 요소로 이동하지 않는다.
    assert.equal(forward.defaultPrevented, true);
    assert.equal(reverse.defaultPrevented, true);
    assert.equal(harness.document.activeElement, harness.cancel);
    harness.amount.focus();
    assert.equal(harness.key("Tab").defaultPrevented, false);
    harness.cleanup();
});

test("receipt modal keeps explicit initial focus, Escape closing and return focus", () => {
    // 준비: 기존 원본 확인 입력에 초기 포커스 표시가 있다.
    const harness = modalFocusHarness({ explicitInitialFocus: true });
    assert.equal(harness.document.activeElement, harness.amount);
    assert.equal(harness.parent.inert, true);
    assert.equal(harness.parentAttributes.get("aria-hidden"), "true");

    // 실행: Escape로 닫은 뒤 effect 정리를 실행한다.
    const escape = harness.key("Escape");
    harness.cleanup();
    harness.flushTimers();

    // 검증: 링크 추가 뒤에도 기존 닫기·부모 접근성·포커스 복귀 동작을 보존한다.
    assert.equal(escape.defaultPrevented, true);
    assert.equal(escape.propagationStopped, true);
    assert.equal(harness.closeCalls(), 1);
    assert.equal(harness.parent.inert, false);
    assert.equal(harness.parentAttributes.get("aria-hidden"), "false");
    assert.equal(harness.document.activeElement, harness.returnTarget);
});
