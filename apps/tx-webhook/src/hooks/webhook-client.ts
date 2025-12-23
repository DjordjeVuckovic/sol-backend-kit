export type WebHookReq<T> = {
    url: string,
    payload: T
}
export const sendWebhookReq = async <T>(req: WebHookReq<T>): Promise<Response> => {
    const {url, payload} = req;
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
}