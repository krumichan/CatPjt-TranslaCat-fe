type MonthlyExpenseChartBudgetDotProps = {
    cx?: number;
    cy?: number;
};

export default function MonthlyExpenseChartBudgetDot({
    cx,
    cy,
}: MonthlyExpenseChartBudgetDotProps) {
    if (cx == null || cy == null) {
        return null;
    }

    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            stroke="#60a5fa"
            strokeWidth={3}
            fill="#ffffff"
        />
    );
}