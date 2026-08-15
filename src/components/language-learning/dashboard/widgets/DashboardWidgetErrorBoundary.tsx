"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface DashboardWidgetErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
}

interface DashboardWidgetErrorBoundaryState {
    failed: boolean;
}

export class DashboardWidgetErrorBoundary extends Component<
    DashboardWidgetErrorBoundaryProps,
    DashboardWidgetErrorBoundaryState
> {
    state: DashboardWidgetErrorBoundaryState = { failed: false };

    static getDerivedStateFromError(): DashboardWidgetErrorBoundaryState {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Language Learning dashboard widget failed.", error, info);
    }

    render() {
        if (this.state.failed) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}
