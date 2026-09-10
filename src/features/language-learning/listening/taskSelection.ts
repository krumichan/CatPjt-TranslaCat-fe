import type { ListeningTaskType } from "@/types/language-learning/listening";

export function isValidListeningTaskSelection(tasks: ListeningTaskType[]): boolean {
    const unique = new Set(tasks);
    if (unique.size !== tasks.length || unique.size === 0) return false;
    if (unique.size === 1 && (unique.has("COMPREHENSION") || unique.has("SUMMARY"))) return true;
    if (unique.has("COMPREHENSION") || unique.has("SUMMARY")) return false;
    if (unique.has("INTERPRETATION") && unique.size === 1) return false;
    return unique.has("DICTATION") || unique.has("REPEAT_AFTER_AUDIO");
}
