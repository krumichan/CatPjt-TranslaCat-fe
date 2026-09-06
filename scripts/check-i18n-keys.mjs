import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const MESSAGES_ROOT = path.join(ROOT, "messages");
const LOCALES = ["ko", "ja", "learning"];
const BASE_LOCALE = "ko";

function flattenLeaves(value, prefix = "", result = new Map()) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        result.set(prefix, value);
        return result;
    }

    for (const [key, child] of Object.entries(value)) {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        flattenLeaves(child, nextPrefix, result);
    }

    return result;
}

function placeholders(value) {
    if (typeof value !== "string") {
        return [];
    }

    return [...value.matchAll(/\{([A-Za-z0-9_]+)(?:,[^}]*)?\}/g)]
        .map((match) => match[1])
        .sort();
}

async function readLocaleFiles(locale) {
    const directory = path.join(MESSAGES_ROOT, locale);
    const filenames = (await readdir(directory))
        .filter((filename) => filename.endsWith(".json"))
        .sort();
    const files = new Map();

    for (const filename of filenames) {
        const raw = await readFile(path.join(directory, filename), "utf8");
        files.set(filename, JSON.parse(raw));
    }

    return files;
}

const localeFiles = new Map();
for (const locale of LOCALES) {
    localeFiles.set(locale, await readLocaleFiles(locale));
}

const baseFiles = localeFiles.get(BASE_LOCALE);
const errors = [];

for (const locale of LOCALES.filter((candidate) => candidate !== BASE_LOCALE)) {
    const files = localeFiles.get(locale);
    const baseNames = [...baseFiles.keys()];
    const localeNames = [...files.keys()];

    for (const filename of baseNames.filter((name) => !files.has(name))) {
        errors.push(`[${locale}] missing file: ${filename}`);
    }
    for (const filename of localeNames.filter((name) => !baseFiles.has(name))) {
        errors.push(`[${locale}] extra file: ${filename}`);
    }

    for (const filename of baseNames.filter((name) => files.has(name))) {
        const baseLeaves = flattenLeaves(baseFiles.get(filename));
        const localeLeaves = flattenLeaves(files.get(filename));

        for (const key of baseLeaves.keys()) {
            if (!localeLeaves.has(key)) {
                errors.push(`[${locale}] ${filename}: missing key ${key}`);
                continue;
            }

            const basePlaceholders = placeholders(baseLeaves.get(key));
            const localePlaceholders = placeholders(localeLeaves.get(key));
            if (basePlaceholders.join("|") !== localePlaceholders.join("|")) {
                errors.push(
                    `[${locale}] ${filename}: placeholder mismatch at ${key} ` +
                        `(base=${basePlaceholders.join(",") || "-"}, ` +
                        `locale=${localePlaceholders.join(",") || "-"})`,
                );
            }
        }

        for (const key of localeLeaves.keys()) {
            if (!baseLeaves.has(key)) {
                errors.push(`[${locale}] ${filename}: extra key ${key}`);
            }
        }
    }
}

// Dynamic next-intl keys cannot be inferred from locale-to-locale parity alone.
// Keep the namespaces that render Listening task/metric enums in sync with the
// canonical Listening labels so missing runtime keys fail CI instead of leaking
// `LanguageLearning....` strings into the UI.
for (const locale of LOCALES) {
    const languageLearningFile = localeFiles.get(locale)?.get("languageLearning.json");
    const languageLearning = languageLearningFile?.LanguageLearning;
    if (!languageLearning) {
        errors.push(`[${locale}] languageLearning.json: missing LanguageLearning root`);
        continue;
    }

    const canonicalTasks = languageLearning.listening?.task ?? {};
    const taskTargets = [
        ["LanguageLearning.history.listening.task", languageLearning.history?.listening?.task ?? {}],
        ["LanguageLearning.dashboard.v3.task", languageLearning.dashboard?.v3?.task ?? {}],
    ];

    for (const taskKey of Object.keys(canonicalTasks)) {
        for (const [targetPath, target] of taskTargets) {
            if (!(taskKey in target)) {
                errors.push(`[${locale}] languageLearning.json: missing dynamic key ${targetPath}.${taskKey}`);
            }
        }
    }

    const listeningMetrics = languageLearning.listening?.result?.metrics ?? {};
    const dashboardMetrics = languageLearning.dashboard?.v3?.metric ?? {};
    for (const metricKey of Object.keys(listeningMetrics)) {
        if (!(metricKey in dashboardMetrics)) {
            errors.push(`[${locale}] languageLearning.json: missing dynamic key LanguageLearning.dashboard.v3.metric.${metricKey}`);
        }
    }
}

if (errors.length > 0) {
    console.error(`i18n validation failed with ${errors.length} issue(s):`);
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exit(1);
}

console.log(
    `i18n validation passed: ${LOCALES.join(", ")} / ${baseFiles.size} files`,
);
