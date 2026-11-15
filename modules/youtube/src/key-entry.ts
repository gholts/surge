function keyMain() {
    try {
        const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
        if (
            (endpoint !== "config" && endpoint !== "log_event") ||
            !$response.body?.length
        )
            return $done();
        const group = binaryAt(
            $response.body,
            [1, 16, 7, 138536474, 146311580],
        );
        if (!group) return $done();
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
            const current = config[platform] as StoredKeys | undefined;
            const value: StoredKeys = {
                clientKey: clientKey.toBase64(),
                encryptKey: encryptKey.toBase64(),
            };
            if (
                current?.clientKey !== value.clientKey ||
                current?.encryptKey !== value.encryptKey
            ) {
                const previous = keyCandidates(current)
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
