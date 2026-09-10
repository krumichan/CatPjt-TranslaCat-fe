import type { LevelTestHistoryItemDetail, LevelTestOption } from "@/types/language-learning/level";

function optionText(options: LevelTestOption[], key: string): string {
    const option = options.find((value) => value.key === key);
    return option ? `${option.key}. ${option.text}` : key;
}

function optionSequence(options: LevelTestOption[], keys: string[]): string {
    return keys.map((key) => optionText(options, key)).join(" → ");
}

export function userAnswerText(item: LevelTestHistoryItemDetail): string | null {
    if (item.textAnswer) return item.textAnswer;
    if (item.selectedOptionKeys.length > 0) {
        return optionSequence(item.options, item.selectedOptionKeys);
    }
    if (item.selectedOptionKey) {
        return optionText(item.options, item.selectedOptionKey);
    }
    return null;
}

export function correctAnswerText(item: LevelTestHistoryItemDetail): string | null {
    if (item.correctOrder.length > 0) {
        return optionSequence(item.options, item.correctOrder);
    }
    if (item.correctOptionKey) {
        return optionText(item.options, item.correctOptionKey);
    }
    return null;
}
