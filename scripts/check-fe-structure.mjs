import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { selectSourceFiles } from "./lib/structure-source-files.mjs";

// This is a source-structure guard, not a replacement for tsc/ESLint/React tests.
// An optional project directory also lets tooling tests exercise real failure paths.
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(process.argv[2] ?? defaultRoot);
const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
if (config.error) {
    console.error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
    process.exit(1);
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (file) => file,
        getNewLine: () => "\n",
    }));
    process.exit(1);
}
const program = ts.createProgram(parsed.fileNames, { ...parsed.options, incremental: false });
const checker = program.getTypeChecker();
const sourceRoot = path.join(root, "src");
let files;
try {
    files = selectSourceFiles(program.getSourceFiles(), sourceRoot, ts.sys.useCaseSensitiveFileNames);
} catch (error) {
    console.error(`FE structure check failed: ${error.message}`);
    process.exit(1);
}
const errors = [];
let localImports = 0;
let componentFiles = 0;

function hasJsx(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
    return Boolean(ts.forEachChild(node, hasJsx));
}

// JSX-returning PascalCase functions, including nested definitions and memo/forwardRef wrappers.
// Components written exclusively with createElement are outside this check's scope.
function componentName(node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.body && hasJsx(node.body)) return node.name.text;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const initializer = node.initializer;
        if ((ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer) || ts.isCallExpression(initializer)) && hasJsx(initializer)) {
            return node.name.text;
        }
    }
    if (ts.isClassDeclaration(node) && node.name && node.members.some((member) =>
        ts.isMethodDeclaration(member) && member.name.getText() === "render" && member.body && hasJsx(member.body),
    )) return node.name.text;
    return null;
}

for (const file of files) {
    const relative = path.relative(root, file.fileName).split(path.sep).join("/");
    const components = [];
    const report = (node, message) => {
        const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        errors.push(`${relative}:${line}: ${message}`);
    };

    for (const diagnostic of file.parseDiagnostics) {
        errors.push(`${relative}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }

    function inspectImport(node, specifier) {
        if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return;
        localImports += 1;
        const target = ts.resolveModuleName(specifier, file.fileName, parsed.options, ts.sys).resolvedModule;
        if (!target) {
            const asset = /\.(?:css|scss|svg|png|jpe?g|webp|gif|ico|woff2?)$/.test(specifier);
            const assetPath = specifier.startsWith("@/")
                ? path.join(root, "src", specifier.slice(2))
                : path.resolve(path.dirname(file.fileName), specifier);
            if (!(asset && existsSync(assetPath))) report(node, `Unresolved local import: ${specifier}`);
            return;
        }
        const targetFile = program.getSourceFile(target.resolvedFileName);
        const targetSymbol = targetFile && checker.getSymbolAtLocation(targetFile);
        if (!targetSymbol) return;
        const exportedNames = new Set(checker.getExportsOfModule(targetSymbol).map((symbol) => symbol.name));
        if (ts.isImportDeclaration(node) && node.importClause) {
            if (node.importClause.name && !exportedNames.has("default")) report(node, `No default export: ${specifier}`);
            const bindings = node.importClause.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) {
                for (const item of bindings.elements) {
                    const importedName = item.propertyName?.text ?? item.name.text;
                    if (!exportedNames.has(importedName)) report(item, `No export ${importedName}: ${specifier}`);
                }
            }
        }
        if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
            for (const item of node.exportClause.elements) {
                const importedName = item.propertyName?.text ?? item.name.text;
                if (!exportedNames.has(importedName)) report(item, `No re-export ${importedName}: ${specifier}`);
            }
        }
    }

    function visit(node) {
        const name = componentName(node);
        if (name && /^[A-Z]/.test(name)) components.push(name);
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            inspectImport(node, node.moduleSpecifier.text);
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
            inspectImport(node, node.arguments[0].text);
        }
        ts.forEachChild(node, visit);
    }
    visit(file);
    if (components.length) componentFiles += 1;
    if (components.length > 1) errors.push(`${relative}: Multiple JSX components: ${components.join(", ")}`);
}

if (errors.length) {
    console.error(`FE structure check failed (${errors.length}):\n${errors.join("\n")}`);
    process.exitCode = 1;
} else {
    console.log(`FE structure check passed: ${files.length} source modules, ${componentFiles} JSX component files, ${localImports} local imports (TypeScript ${ts.version}).`);
}
