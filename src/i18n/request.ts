import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { Locale, locales } from "@/i18n/config";

type Messages = Record<string, unknown>;

const MESSAGE_FILE_NAMES = [
    "common",
    "login",
    "navigation",
    "notification",
    "serviceSelect",
    "voice",
    "platform",
    "ranking",
    "accountBook",
    "settings",
] as const;

function isObject(value: unknown): value is Messages {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function mergeMessages(base: Messages, next: Messages): Messages {
    const merged: Messages = { ...base };

    Object.entries(next).forEach(([key, value]) => {
        const currentValue = merged[key];

        if (isObject(currentValue) && isObject(value)) {
            merged[key] = mergeMessages(currentValue, value);
            return;
        }

        merged[key] = value;
    });

    return merged;
}

async function loadMessageFile(locale: Locale, fileName: string) {
    try {
        return (
            await import(`../../messages/${locale}/${fileName}.json`)
        ).default as Messages;
    } catch {
        return {};
    }
}

async function loadMessages(locale: Locale) {
    const messageFiles = await Promise.all(
        MESSAGE_FILE_NAMES.map((fileName) =>
            loadMessageFile(locale, fileName)
        )
    );

    return messageFiles.reduce<Messages>(
        (mergedMessages, messageFile) =>
            mergeMessages(mergedMessages, messageFile),
        {}
    );
}

export default getRequestConfig(async ({ requestLocale }) => {
    const locale = await requestLocale;

    const isValidLocale = locales.includes(locale as Locale);

    if (!locale || !isValidLocale) {
        notFound();
    }

    const validLocale = locale as Locale;

    return {
        locale: validLocale,
        messages: await loadMessages(validLocale),
    };
});
