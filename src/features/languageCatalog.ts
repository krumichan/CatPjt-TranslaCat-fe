export interface ServiceLanguage {
    code: string;
    name: string;
}

export function languageOptions(
    languages: readonly ServiceLanguage[],
    locale: string,
    translatedNames: Readonly<Record<string, string>>,
    selectedCodes: readonly string[] = [],
) {
    const displayLocale = locale === "learning" ? "ja" : locale;
    let names: Intl.DisplayNames | undefined;
    try {
        names = new Intl.DisplayNames([displayLocale], { type: "language" });
    } catch {
        // 알 수 없는 표시 locale에서도 DB에 등록된 이름과 코드는 사용할 수 있다.
    }

    const seen = new Set<string>();
    // 목록을 기다리거나 가져오지 못해도 저장된 언어를 다른 선택지처럼 보이게 하지 않는다.
    const catalog = [...languages, ...selectedCodes.map(code => ({ code, name: code }))];
    return catalog.flatMap((language) => {
        const code = language.code.trim();
        if (!code || seen.has(code)) return [];
        seen.add(code);
        let label = translatedNames[code];
        if (!label) {
            try {
                label = names?.of(code) ?? "";
            } catch {
                // Intl이 모르는 서비스 언어 코드는 DB 이름으로 표시한다.
            }
        }
        return [{ code, label: label && label !== code ? label : language.name || code }];
    });
}
