declare const $request: { url: string; headers?: Record<string, string> };
declare const $response: {
    body?: string | Uint8Array;
    headers?: Record<string, string>;
};
declare function $done(result: {
    body?: string | Uint8Array;
    headers?: Record<string, string>;
}): void;
