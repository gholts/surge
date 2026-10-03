function requestMain() {
    let path: string | undefined;
    try {
        path = $request.url.split("?")[0];
        let result: SurgeResult | undefined;
        if (path.endsWith("/player/ad_break")) result = emptyPlayback();
        else if (path.endsWith("/log_event"))
            result = prepareLogEvent($request);
        else if (path.endsWith("/initplayback"))
            result = preparePlayback($request.body, platformKey($request));
        else if (path.endsWith("/videoplayback")) {
            const body =
                readOptions().autoHd === false ? undefined : $request.body;
            if (body instanceof Uint8Array && body.length) {
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
    body: SurgeRequest["body"],
    platform: Platform,
): SurgeResult | undefined {
    const expected = readConfig()[platform] as StoredKeys | undefined,
        storedKey = expected?.encryptKey;
    let key;
    try {
        if (storedKey) {
            if (typeof storedKey !== "string")
                throw new Error("Invalid stored encryptKey");
            key = decodeBase64(storedKey);
        }
    } catch (error) {
        clearKeys(platform, expected);
        throw error;
    }
    if (body !== undefined && !(body instanceof Uint8Array))
        throw new Error("Playback requires binary body");
    const encrypted =
        body instanceof Uint8Array ? bytesField(body, 3) : undefined;
    const clientKey = encrypted && bytesField(encrypted, 5);
    if (!clientKey?.length) return emptyPlayback();
    if (key && sameBytes(clientKey, key)) return;
    clearKeys(platform, expected);
    return emptyPlayback();
}
