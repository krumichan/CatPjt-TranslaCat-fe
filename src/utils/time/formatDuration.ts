/** 音声の経過時間を m:ss で表示する。負の値や有限でない値は 0:00 とする。 */
export function formatDuration(seconds: number): string {
    const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const minutes = Math.floor(wholeSeconds / 60);
    const remainder = wholeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
