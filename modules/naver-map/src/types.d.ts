declare const $request: { url: string };
declare const $response: { body?: string };
declare function $done(result: {
    body?: string;
    response?: {
        status: number;
        headers: Record<string, string>;
        body: string;
    };
}): void;
