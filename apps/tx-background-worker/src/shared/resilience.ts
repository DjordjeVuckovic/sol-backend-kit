export type RetryOptions = {
    retries: number
    delayMs: number
}
export const retry = async <T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> => {
    const { retries = 3, delayMs = 1000 } = options || {}

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            if (attempt === retries) {
                throw error
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }
    throw new Error('Retry attempts exhausted')
}
