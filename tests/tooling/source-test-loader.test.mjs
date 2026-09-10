import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import process from "node:process";

import { load, resolve } from "../helpers/source-test-loader.mjs";

const durationUrl = new URL("../../src/utils/time/formatDuration.ts", import.meta.url);
const unexpectedDelegate = () => { throw new Error("Source TS should use the test loader"); };

test("test loader turns source TypeScript into executable ESM", async () => {
    const result = await load(durationUrl.href, {}, unexpectedDelegate);
    assert.equal(result.format, "module");
    assert.equal(result.shortCircuit, true);
    const loadedModule = await import(`data:text/javascript;base64,${Buffer.from(result.source).toString("base64")}`);
    assert.equal(loadedModule.formatDuration(65), "1:05");
    assert.equal(loadedModule.formatDuration(-1), "0:00");
});

test("test loader resolves alias and extensionless source imports", async () => {
    for (const [specifier, parentURL] of [
        ["@/utils/time/formatDuration", import.meta.url],
        ["./formatDuration", new URL("./other.ts", durationUrl).href],
    ]) {
        const result = await resolve(specifier, { parentURL }, unexpectedDelegate);
        assert.equal(result.url, durationUrl.href);
    }
});

test("test loader does not change built-ins, dependencies or non-TS module formats", async () => {
    for (const url of [
        "node:fs",
        new URL("../../node_modules/example/index.ts", import.meta.url).href,
        new URL("../../src/example.cjs", import.meta.url).href,
        new URL("../../src/example.mjs", import.meta.url).href,
        new URL("../../src-other/example.ts", import.meta.url).href,
    ]) {
        const context = { format: "commonjs" };
        const expected = { source: "delegated" };
        assert.equal(await load(url, context, (received, actualContext) => {
            assert.equal(received, url);
            assert.equal(actualContext, context);
            return expected;
        }), expected);
    }
});

test("source-test imports run without module-type or native-type-stripping warnings", () => {
    const registerUrl = new URL("../helpers/register-source-loader.mjs", import.meta.url).href;
    const result = spawnSync(process.execPath, [
        "--import", registerUrl, "--input-type=module", "--eval",
        `import { formatDuration } from ${JSON.stringify(durationUrl.href)}; console.log(formatDuration(125));`,
    ], { encoding: "utf8", timeout: 15000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "2:05");
    assert.doesNotMatch(result.stderr, /MODULE_TYPELESS_PACKAGE_JSON|ExperimentalWarning: Type Stripping/);
});
