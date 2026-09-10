import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceRoot = new URL("../../src/", import.meta.url);
const fixtureRoot = new URL("../../e2e/support/", import.meta.url);

/** Resolve Next's source alias and extensionless TS imports for source tests. */
export async function resolve(specifier, context, nextResolve) {
    let target;
    if (specifier.startsWith("@/")) {
        target = new URL(specifier.slice(2), sourceRoot);
    } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
        target = new URL(specifier, context.parentURL);
    }
    if (target) {
        const base = fileURLToPath(target);
        for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
            if (existsSync(candidate) && /\.(?:mjs|cjs|js|ts|tsx)$/.test(candidate)) {
                return { url: pathToFileURL(candidate).href, shortCircuit: true };
            }
        }
    }
    return nextResolve(specifier, context);
}

/** Source tests use ESM; do not change the package mode or dependency formats. */
export async function load(url, context, nextLoad) {
    const isTestSource = url.startsWith(sourceRoot.href) || url.startsWith(fixtureRoot.href);
    if (isTestSource && new URL(url).pathname.endsWith(".ts")) {
        const result = ts.transpileModule(await readFile(new URL(url), "utf8"), {
            fileName: fileURLToPath(url),
            compilerOptions: {
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                verbatimModuleSyntax: true,
                inlineSourceMap: true,
                inlineSources: true,
            },
            reportDiagnostics: true,
        });
        const errors = result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) ?? [];
        if (errors.length) {
            throw new SyntaxError(errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
        }
        // This is transpilation only. `npm run typecheck` performs semantic checks.
        return { format: "module", source: result.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
}
