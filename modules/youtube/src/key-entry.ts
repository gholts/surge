function keyMain() {
    try {
        const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
        if (
            (endpoint !== "config" && endpoint !== "log_event") ||
            !$response.body?.length
        )
            return $done();
        let group: Uint8Array | undefined = $response.body;
        for (const no of [1, 16, 7, 138536474, 146311580]) {
            group = bytesField(group, no, true);
            if (!group) return $done();
        }
        const clientKey = bytesField(group, 1, true),
            encryptKey = bytesField(group, 2, true);
        if (
            clientKey?.length &&
            encryptKey?.length &&
            clientKey.length <= 4096 &&
            encryptKey.length <= 4096
        ) {
            const platform = platformKey($request),
                config = readConfig();
            const value: StoredKeys = {
                clientKey: clientKey.toBase64(),
                encryptKey: encryptKey.toBase64(),
            };
            if (
                (config[platform] as StoredKeys | undefined)?.clientKey !==
                    value.clientKey ||
                (config[platform] as StoredKeys | undefined)?.encryptKey !==
                    value.encryptKey
            ) {
                const previous = keyCandidates(
                    config[platform] as StoredKeys | undefined,
                )
                    .filter(
                        (pair) =>
                            pair.clientKey !== value.clientKey ||
                            pair.encryptKey !== value.encryptKey,
                    )
                    .slice(0, 3)
                    .map(({ clientKey, encryptKey }) => ({
                        clientKey,
                        encryptKey,
                    }));
                if (previous.length) value.previous = previous;
                config[platform] = value;
                if (!writeConfig(config))
                    console.log("YouTube key write failed");
            }
        }
        $done();
    } catch (error) {
        console.log("YouTube keys: " + error);
        $done();
    }
}
