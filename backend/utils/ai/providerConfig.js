export const RETRYABLE_STATUS_CODES = [
    429,
    500,
    502,
    503,
    504,
];

export const MAX_RETRIES = 3;

export const INITIAL_RETRY_DELAY = 1000;

export const PROVIDERS = [
    {
        name: "Gemini",
        models: [
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
        ],
    },
    {
        name: "Groq",
        models: [
            "llama-3.3-70b-versatile",
            "gemma2-9b-it",
        ],
    },
];