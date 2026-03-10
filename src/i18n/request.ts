import {notFound} from "next/navigation";
import {getRequestConfig} from "next-intl/server";
import {Locale, locales} from "@/i18n/config";

export default getRequestConfig(async ({requestLocale}) => {
    const locale = await requestLocale;

    const isValidLocale = locales.includes(locale as Locale);

    if (!locale || !isValidLocale) {
        notFound();
    }

    return {
        locale: locale as Locale,
        messages: (await import(`@/../messages/${locale}.json`)).default
    };
});