#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const messagesRoot = path.join(projectRoot, "messages");
const locales = ["ko", "ja"];

function readJsonFiles(locale) {
    const localeDir = path.join(messagesRoot, locale);

    if (!existsSync(localeDir)) {
        throw new Error(`Missing locale directory: ${localeDir}`);
    }

    const files = collectJsonFiles(localeDir);
    const merged = {};

    for (const file of files) {
        const raw = readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        deepMerge(merged, parsed);
    }

    return merged;
}

function collectJsonFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return collectJsonFiles(fullPath);
        }

        return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
    });
}

function deepMerge(target, source) {
    for (const [key, value] of Object.entries(source)) {
        if (isPlainObject(value) && isPlainObject(target[key])) {
            deepMerge(target[key], value);
            continue;
        }

        target[key] = value;
    }
}

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function flattenMessages(value, prefix = "") {
    if (typeof value === "string") {
        return [[prefix, value]];
    }

    if (!isPlainObject(value)) {
        return [];
    }

    return Object.entries(value).flatMap(([key, nestedValue]) => {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        return flattenMessages(nestedValue, nextPrefix);
    });
}

function extractPlaceholders(message) {
    const placeholders = new Set();
    const pattern = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,[^{}]+)?\}/g;
    let match;

    while ((match = pattern.exec(message)) !== null) {
        placeholders.add(match[1]);
    }

    return [...placeholders].sort();
}

function compareSets(left, right) {
    const rightSet = new Set(right);
    return left.filter((value) => !rightSet.has(value));
}

const [koMessages, jaMessages] = locales.map(readJsonFiles);
const koEntries = flattenMessages(koMessages);
const jaEntries = flattenMessages(jaMessages);
const koMap = new Map(koEntries);
const jaMap = new Map(jaEntries);

const koKeys = [...koMap.keys()].sort();
const jaKeys = [...jaMap.keys()].sort();
const missingInJa = compareSets(koKeys, jaKeys);
const missingInKo = compareSets(jaKeys, koKeys);
const placeholderMismatches = [];

for (const key of koKeys) {
    if (!jaMap.has(key)) {
        continue;
    }

    const koPlaceholders = extractPlaceholders(koMap.get(key));
    const jaPlaceholders = extractPlaceholders(jaMap.get(key));

    const missingJaPlaceholders = compareSets(koPlaceholders, jaPlaceholders);
    const missingKoPlaceholders = compareSets(jaPlaceholders, koPlaceholders);

    if (missingJaPlaceholders.length > 0 || missingKoPlaceholders.length > 0) {
        placeholderMismatches.push({
            key,
            ko: koPlaceholders,
            ja: jaPlaceholders,
        });
    }
}

let hasError = false;

if (missingInJa.length > 0) {
    hasError = true;
    console.error("\nMissing i18n keys in ja:");
    for (const key of missingInJa) {
        console.error(`  - ${key}`);
    }
}

if (missingInKo.length > 0) {
    hasError = true;
    console.error("\nMissing i18n keys in ko:");
    for (const key of missingInKo) {
        console.error(`  - ${key}`);
    }
}

if (placeholderMismatches.length > 0) {
    hasError = true;
    console.error("\nMismatched i18n placeholders:");
    for (const mismatch of placeholderMismatches) {
        console.error(`  - ${mismatch.key}`);
        console.error(`    ko: ${mismatch.ko.join(", ") || "-"}`);
        console.error(`    ja: ${mismatch.ja.join(", ") || "-"}`);
    }
}

if (hasError) {
    process.exit(1);
}

console.log(
    `i18n key check passed. ko=${koKeys.length}, ja=${jaKeys.length}`,
);
