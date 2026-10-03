async function umpMain() {
    let platform: Platform | undefined,
        expected: StoredKeys | undefined,
        invalidStoredKey = false;
    try {
        const status = Number($response.status);
        if (status >= 300 && status < 400) return $done();
        platform = platformKey($request);
        expected = readConfig()[platform] as StoredKeys | undefined;
        const clientKey = expected?.clientKey;
        if (!clientKey)
            throw new Error("YouTubeConfig requires stored clientKey");
        let key;
        try {
            if (typeof clientKey !== "string")
                throw new Error("Invalid stored clientKey");
            key = decodeBase64(clientKey);
            if (key.length < 16) throw new Error("Invalid stored clientKey");
        } catch (error) {
            invalidStoredKey = true;
            throw error;
        }
        if (!$response.body) throw new Error("YouTubeConfig requires body");
        const options = readOptions({ blockGames: true });
        const result = await transformUmp($response.body, key, options);
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
