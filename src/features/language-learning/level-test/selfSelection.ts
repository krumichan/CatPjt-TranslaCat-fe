/** 既存の整数得点区間の中央値。実際の保存値はLLが同じ規則で決定する。 */
export const LEVEL_SELF_SELECTION_OPTIONS = [
    { band: "B1", score: 20, proficiencyBand: "FOUNDATION" },
    { band: "B2", score: 47, proficiencyBand: "BASIC" },
    { band: "B3", score: 62, proficiencyBand: "INTERMEDIATE" },
] as const;
