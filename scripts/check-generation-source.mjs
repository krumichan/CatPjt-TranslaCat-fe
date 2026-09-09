// Syntax and local-import checks only; this does not replace tsc or next build.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const parserPath = process.env.PROGRESSIVE_BABEL_PARSER
    || path.join(path.dirname(require.resolve("playwright/package.json")), "lib/transform/babelBundle.js");
const { babelParse } = require(parserPath);

function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : /\.(?:ts|tsx|mjs)$/.test(entry.name) ? [filename] : [];
    });
}

const targets = ["src/features/language-learning", "src/hooks/language-learning", "src/components/language-learning", "src/services/language-learning", "src/types/language-learning", "e2e/language-learning", "tests/language-learning"]
    .flatMap((directory) => files(path.join(root, directory)));
let localImports = 0;
for (const filename of targets) {
    const ast = babelParse(readFileSync(filename, "utf8"), filename, true);
    for (const statement of ast.program.body) {
        const source = statement.source?.value;
        if (typeof source !== "string" || (!source.startsWith("@/") && !source.startsWith("."))) continue;
        const target = source.startsWith("@/")
            ? path.join(root, "src", source.slice(2))
            : path.resolve(path.dirname(filename), source);
        const candidates = [target, ...[".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"].map((suffix) => target + suffix)];
        if (!candidates.some(existsSync)) throw new Error(`Unresolved local import ${source} in ${path.relative(root, filename)}`);
        localImports += 1;
    }
}
console.log(`Language Learning syntax/import checks passed: ${targets.length} files, ${localImports} local imports. Not a TypeScript typecheck.`);
