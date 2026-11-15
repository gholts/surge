declare const $request: { url: string; headers?: Record<string, string> };
declare const $response: { body?: string };
declare function $done(result: {
    body?: string;
    headers?: Record<string, string>;
}): void;
