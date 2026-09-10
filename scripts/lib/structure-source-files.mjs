import path from "node:path";

function normalizeSourcePath(value, caseSensitive) {
    // TypeScript uses '/' on Windows too; Node's path.join uses '\\' there.
    const normalized = path.posix.normalize(value.replaceAll("\\", "/")).replace(/\/+$/, "");
    return caseSensitive ? normalized : normalized.toLowerCase();
}

/** Select src modules with the same separator and case rules on both platforms. */
export function selectSourceFiles(sourceFiles, sourceRoot, caseSensitive) {
    const prefix = `${normalizeSourcePath(sourceRoot, caseSensitive)}/`;
    const selected = sourceFiles.filter((file) =>
        !file.isDeclarationFile && normalizeSourcePath(file.fileName, caseSensitive).startsWith(prefix),
    );
    if (selected.length === 0) {
        throw new Error(`No source modules found under ${sourceRoot}; refusing an empty structure check.`);
    }
    return selected;
}
