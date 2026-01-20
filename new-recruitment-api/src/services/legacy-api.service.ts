import { CreateCandidateDto } from "../types/candidate";
import { env } from "../config/env";
import http from "http";
import https from "https";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 200;
const REQUEST_TIMEOUT_MS = 10000;

const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
});

export class LegacyApiError extends Error {
    constructor(message: string, public statusCode: number, public response?: unknown) {
        super(message);
        this.name = "LegacyApiError";
    }
}

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

export class LegacyApiService {
    private async attemptSendCandidate(candidate: CreateCandidateDto): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(`${env.LEGACY_API_URL}/candidates`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": env.LEGACY_API_KEY,
                },
                body: JSON.stringify({
                    firstName: candidate.firstName,
                    lastName: candidate.lastName,
                    email: candidate.email,
                }),
                signal: controller.signal,
                // @ts-expect-error - node.js fetch supports agent but types don't
                agent: env.LEGACY_API_URL.startsWith("https") ? httpsAgent : httpAgent,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new LegacyApiError(
                    (errorData as { message?: string }).message ||
                    `Legacy API returned status ${response.status}`,
                    response.status,
                    errorData
                );
            }

            return response;
        } catch (error) {
            if ((error as Error).name === "AbortError") {
                throw new LegacyApiError("Request timeout", 504);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async sendCandidate(candidate: CreateCandidateDto): Promise<void> {
        let lastError: LegacyApiError | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const response = await this.attemptSendCandidate(candidate);
                await response.json();
                return;
            } catch (error) {
                if (error instanceof LegacyApiError && error.statusCode === 504) {
                    lastError = error;

                    if (attempt < MAX_RETRIES - 1) {
                        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
                        await sleep(backoffMs);
                        continue;
                    }
                }

                if (error instanceof LegacyApiError) {
                    throw error;
                }

                if (error instanceof Error) {
                    throw new LegacyApiError(
                        `Failed to communicate with Legacy API: ${error.message}`,
                        0,
                        { originalError: error.message }
                    );
                }

                throw new LegacyApiError(
                    "Unknown error occurred while communicating with Legacy API",
                    0
                );
            }
        }

        if (lastError) {
            throw lastError;
        }
    }
}
