function requestMain() {
    let path: string | undefined;
    try {
        path = $request.url.split("?")[0];
        let result: SurgeResult | undefined;
        if (path.endsWith("/player/ad_break")) result = emptyPlayback();
        else if (path.endsWith("/log_event"))
            result = prepareLogEvent($request);
        else if (path.endsWith("/initplayback")) {
            // Redirect discovery uses bodyless GETs on the same endpoint.
            if ($request.method !== "GET" && $request.method !== "HEAD") {
                const body = binaryRequestBody($request);
                result = preparePlayback(body, platformKey($request));
                if (!result && body?.length && readOptions().autoHd !== false) {
                    const output = preferInitialQuality(body);
                    if (output !== body) result = { body: output };
                }
            }
        } else if (path.endsWith("/videoplayback")) {
            const options = readOptions();
            const body =
                options.autoHd === false
                    ? undefined
                    : binaryRequestBody($request);
            if (body?.length) {
                const output = forceHighestQuality(body, $request.url);
                if (output !== body) result = { body: output };
            }
        }
        $done(result);
    } catch (error) {
        console.log("YouTube request: " + error);
        if (path?.endsWith("/initplayback")) {
            $done(emptyPlayback());
        } else $done();
    }
}
function binaryRequestBody(request: SurgeRequest) {
    const body = request.body;
    // Native JSC byte views need not share the script's Uint8Array constructor.
    if (ArrayBuffer.isView(body))
        return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    if (body?.length)
        throw new Error("YouTube requires binary-body-mode for request bodies");
    const length = Object.entries(request.headers ?? {}).find(
        ([name]) => name.toLowerCase() === "content-length",
    )?.[1];
    if (Number(length) > 0)
        throw new Error(
            "YouTube request body unavailable; requires-body must be enabled",
        );
}
function emptyPlayback() {
    return {
        response: {
            status: 200,
            headers: { "Content-Type": "application/x-protobuf" },
            body: new Uint8Array(),
        },
    };
}
function prepareLogEvent(request: SurgeRequest): SurgeResult | undefined {
    const names = Object.keys(request.headers ?? {}).filter(
        (name) => name.toLowerCase() === "x-youtube-hot-hash-data",
    );
    if (
        !names.length ||
        (readConfig()[platformKey(request)] as StoredKeys | undefined)
            ?.clientKey
    )
        return;
    const headers = { ...request.headers };
    for (const name of names) delete headers[name];
    return { headers };
}
function preparePlayback(
    body: Uint8Array | undefined,
    platform: Platform,
): SurgeResult | undefined {
    if (body === undefined || body.length === 0) return;
    const expected = readConfig()[platform] as StoredKeys | undefined;
    const encrypted = bytesField(body, 3);
    const clientKey = encrypted && bytesField(encrypted, 5);
    if (!clientKey?.length) return emptyPlayback();
    for (const pair of keyCandidates(expected)) {
        try {
            if (sameBytes(clientKey, decodeBase64(pair.encryptKey as string)))
                return;
        } catch {
            // A malformed entry must not discard another in-flight key.
        }
    }
    clearKeys(platform, expected);
    return emptyPlayback();
}
