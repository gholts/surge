async function umpMain() {
    let platform: Platform | undefined,
        expected: StoredKeys | undefined,
        invalidStoredKey = false;
    try {
        const status = Number($response.status);
        if (status >= 300 || !$response.body?.length) return $done();
        // initplayback also returns redirect URLs and HTTP error documents.
        const contentType = Object.entries($response.headers ?? {}).find(
            ([name]) => name.toLowerCase() === "content-type",
        )?.[1];
        if (
            contentType &&
            !/^application\/vnd\.yt-ump(?:\s*;|\s*$)/i.test(contentType)
        )
            return $done();
        platform = platformKey($request);
        expected = readConfig()[platform] as StoredKeys | undefined;
        const keys: Uint8Array[] = [];
        for (const pair of keyCandidates(expected)) {
            try {
                const key = decodeBase64(pair.clientKey as string);
                if (key.length >= 16) keys.push(key);
            } catch {
                // Other saved keys may still authenticate this response.
            }
        }
        if (!keys.length) {
            invalidStoredKey = expected !== undefined;
            throw new Error("YouTubeConfig requires a valid stored clientKey");
        }
        const options = readOptions({ blockGames: true });
        const result = await transformUmp($response.body, keys, options);
        if (options.autoHd !== false) cacheQuality(result.players);
        $done(
            result.body === $response.body ? undefined : { body: result.body },
        );
    } catch (error) {
        console.log(String(error));
        if (
            invalidStoredKey ||
            (error as { message?: unknown } | null | undefined)?.message ===
                "HMAC verification failed"
        ) {
            try {
                clearKeys(platform, expected);
            } catch (storeError) {
                console.log("YouTube key recovery: " + storeError);
            }
        }
        $done({
            status: 200,
            headers: { "Content-Type": "text/plain" },
            body: new Uint8Array(),
        });
    }
}
