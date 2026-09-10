const HTML_LIKE_TAG_PATTERN = /<\/?[A-Za-z][^>]*>/g;

export function stripPromptMarkup(text: string): string {
    return text.replace(HTML_LIKE_TAG_PATTERN, "");
}

export function splitPromptEmphasis(text: string, emphasisText: string) {
    const plainText = stripPromptMarkup(text);
    const target = emphasisText.trim();
    const index = target ? plainText.indexOf(target) : -1;
    if (index < 0) return { before: plainText, target: null, after: "" };
    return { before: plainText.slice(0, index), target, after: plainText.slice(index + target.length) };
}
