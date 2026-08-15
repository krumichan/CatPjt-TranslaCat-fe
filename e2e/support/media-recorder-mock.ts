import type { Page } from "@playwright/test";

export type SpeakingMicrophoneMockMode =
    | "granted"
    | "denied"
    | "unsupported"
    | "no-device"
    | "busy";

export async function mockSpeakingMediaRecorder(
    page: Page,
    mode: SpeakingMicrophoneMockMode = "granted",
) {
    await page.addInitScript(({ microphoneMode }) => {
        const permissionState =
            microphoneMode === "granted"
                ? "granted"
                : microphoneMode === "denied"
                  ? "denied"
                  : "prompt";

        Object.defineProperty(navigator, "permissions", {
            configurable: true,
            value: {
                query: async () => ({ state: permissionState }),
            },
        });

        if (microphoneMode === "unsupported") {
            Object.defineProperty(navigator, "mediaDevices", {
                configurable: true,
                value: undefined,
            });
            Object.defineProperty(window, "MediaRecorder", {
                configurable: true,
                value: undefined,
            });
            return;
        }

        const track = { stop: () => undefined };
        Object.defineProperty(navigator, "mediaDevices", {
            configurable: true,
            value: {
                getUserMedia: async () => {
                    if (microphoneMode === "denied") {
                        throw new DOMException(
                            "Permission denied",
                            "NotAllowedError",
                        );
                    }
                    if (microphoneMode === "no-device") {
                        throw new DOMException(
                            "No audio input device",
                            "NotFoundError",
                        );
                    }
                    if (microphoneMode === "busy") {
                        throw new DOMException(
                            "Audio input device is busy",
                            "NotReadableError",
                        );
                    }
                    return { getTracks: () => [track] };
                },
            },
        });

        class MockMediaRecorder extends EventTarget {
            static isTypeSupported() {
                return true;
            }

            state = "inactive";
            mimeType = "audio/webm";

            constructor(
                public stream: unknown,
                public options?: unknown,
            ) {
                super();
            }

            start() {
                this.state = "recording";
            }

            stop() {
                if (this.state === "inactive") return;

                this.dispatchEvent(
                    new MessageEvent("dataavailable", {
                        data: new Blob(["mock-audio"], {
                            type: "audio/webm",
                        }),
                    }),
                );
                this.state = "inactive";
                this.dispatchEvent(new Event("stop"));
            }
        }

        Object.defineProperty(window, "MediaRecorder", {
            configurable: true,
            value: MockMediaRecorder,
        });
        Object.defineProperty(URL, "createObjectURL", {
            configurable: true,
            value: () => "blob:mock-speaking-audio",
        });
        Object.defineProperty(URL, "revokeObjectURL", {
            configurable: true,
            value: () => undefined,
        });
    }, { microphoneMode: mode });
}
