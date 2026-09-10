import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { selectSourceFiles } from "../../scripts/lib/structure-source-files.mjs";

const source = (fileName, isDeclarationFile = false) => ({ fileName, isDeclarationFile });
const cases = [
    ["POSIX paths", "/workspace/fe/src", "/workspace/fe/src/Page.tsx", true],
    ["Windows Node root and TypeScript file", "C:\\workspace\\fe\\src", "C:/workspace/fe/src/Page.tsx", false],
    ["Windows TypeScript root and Node file", "C:/workspace/fe/src", "C:\\workspace\\fe\\src\\Page.tsx", false],
    ["Windows case differences", "C:\\WORKSPACE\\FE\\src", "c:/workspace/fe/SRC/Page.tsx", false],
    ["UNC paths", "\\\\server\\share\\fe\\src", "//server/share/fe/src/Page.tsx", false],
    ["spaces and Unicode", "C:\\작업 공간\\FE\\src", "C:/작업 공간/FE/src/Page.tsx", false],
    ["trailing separators", "/workspace/fe/src/", "/workspace/fe/src/Page.tsx", true],
    ["normalized dot segments", "C:/workspace/fe/src", "C:/workspace/fe/src/common/../Page.tsx", false],
];
for (const [label, root, fileName, caseSensitive] of cases) {
    test(`structure source selection handles ${label}`, () => {
        const item = source(fileName);
        assert.deepEqual(selectSourceFiles([item], root, caseSensitive), [item]);
    });
}

test("structure selection excludes siblings, external files and declarations", () => {
    const expected = source("C:/fe/src/Page.tsx");
    assert.deepEqual(selectSourceFiles([
        expected,
        source("C:/fe/src-old/Page.tsx"),
        source("C:/fe/src2/Page.tsx"),
        source("C:/fe/e2e/example.ts"),
        source("C:/fe/src/types.d.ts", true),
        source("C:/fe/src/../../elsewhere.ts"),
    ], "C:\\fe\\src", false), [expected]);
});

test("structure selection keeps case-sensitive filesystem rules", () => {
    assert.throws(() => selectSourceFiles([source("/fe/SRC/Page.tsx")], "/fe/src", true), /No source modules/);
});

test("structure selection refuses empty and declaration-only input", () => {
    for (const files of [[], [source("/fe/src/types.d.ts", true)], [source("/fe/e2e/test.ts")]]) {
        assert.throws(() => selectSourceFiles(files, "/fe/src", true), /refusing an empty structure check/);
    }
});

const checkerScript = fileURLToPath(new URL("../../scripts/check-fe-structure.mjs", import.meta.url));
function runStructureCheck(t, files) {
    const directory = mkdtempSync(path.join(tmpdir(), "tc-fe-구조 검사 "));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    writeFileSync(path.join(directory, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
            target: "ES2022", module: "ESNext", moduleResolution: "bundler",
            jsx: "react-jsx", noLib: true, types: [],
        },
        include: ["src/**/*", "e2e/**/*"],
    }));
    for (const [relative, text] of Object.entries(files)) {
        const target = path.join(directory, relative);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, text);
    }
    const result = spawnSync(process.execPath, [checkerScript, directory], { encoding: "utf8", timeout: 15000 });
    assert.equal(result.error, undefined);
    return result;
}

test("structure CLI checks a real non-empty project with spaces in its path", (t) => {
    const result = runStructureCheck(t, { "src/Page.tsx": "export function Page() { return <main />; }" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 source modules, 1 JSX component files/);
});

test("structure CLI fails instead of passing when only E2E input exists", (t) => {
    const result = runStructureCheck(t, { "e2e/example.ts": "export const sample = 1;" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No source modules.*refusing an empty structure check/);
    assert.doesNotMatch(result.stdout, /check passed/);
});

test("structure CLI rejects two components in one source file", (t) => {
    const result = runStructureCheck(t, {
        "src/Page.tsx": "export function First() { return <main />; } export function Second() { return <aside />; }",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Multiple JSX components: First, Second/);
});

test("structure CLI still rejects missing local imports and exports", (t) => {
    const result = runStructureCheck(t, {
        "src/value.ts": "export const available = 1;",
        "src/Page.tsx": 'import { missing } from "./value"; import "./absent"; export function Page() { return <main>{missing}</main>; }',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No export missing/);
    assert.match(result.stderr, /Unresolved local import: \.\/absent/);
});
