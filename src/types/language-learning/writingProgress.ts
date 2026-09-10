
export type DailyWritingTypeProgressState =
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "EVALUATING"
    | "COMPLETED";

export interface DailyWritingTypeProgress {
    state: DailyWritingTypeProgressState;
    overallScore: number | null;
    activityId: string | null;
}
