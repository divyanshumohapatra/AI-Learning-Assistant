import {
    RETRYABLE_STATUS_CODES,
    MAX_RETRIES,
    INITIAL_RETRY_DELAY,
} from "./providerConfig.js";

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error) {

    const status =
        error?.status ??
        error?.code ??
        error?.response?.status;

    return RETRYABLE_STATUS_CODES.includes(status);
}

export async function retry(
    operation,
    retries = MAX_RETRIES,
    delay = INITIAL_RETRY_DELAY
) {

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.log(
                `Attempt ${attempt}/${retries} failed`
            );

            if (!isRetryable(error)) {
                throw error;
            }

            if (attempt < retries) {
                console.log(
                    `Retrying in ${delay} ms...`
                );
                await sleep(delay);
                delay *= 2;
            }
        }
    }
    throw lastError;
}