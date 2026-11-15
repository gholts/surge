declare const $request: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
};
declare const $response: { body?: string };
declare const $argument: string | undefined;
declare function $done(result: {
    body?: string;
    response?: {
        status: number;
        headers: Record<string, string>;
        body: Uint8Array;
    };
}): void;
